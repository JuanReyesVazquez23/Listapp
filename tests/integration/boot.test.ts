import { addItem } from '@/useCases/items';
import { createTestContext, type TestContext } from './testContext';

describe('arranque de la base de datos', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('activa y verifica foreign_keys y WAL', async () => {
    const pragmas = await ctx.manager.read(async (reader) => {
      const foreignKeys = await reader.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
      const journal = await reader.get<{ journal_mode: string }>('PRAGMA journal_mode');
      const version = await reader.get<{ user_version: number }>('PRAGMA user_version');
      return { foreignKeys, journal, version };
    });

    expect(pragmas.foreignKeys?.foreign_keys).toBe(1);
    expect(pragmas.journal?.journal_mode).toBe('wal');
    expect(pragmas.version?.user_version).toBe(1);
  });

  it('crea las tablas e índices de la v1', async () => {
    const objects = await ctx.manager.read((reader) =>
      reader.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%' ORDER BY name",
      ),
    );
    const names = objects.map((row) => row.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'items',
        'lists',
        'idx_lists_active',
        'idx_lists_history',
        'ux_lists_single_shopping',
      ]),
    );
  });

  it('hace rollback completo si una transacción falla', async () => {
    await expect(
      ctx.manager.mutate(async (tx) => {
        await tx.run(
          `INSERT INTO lists (id, name, status, created_at_utc, updated_at_utc)
           VALUES ('rollback', 'No debe quedar', 'draft', 1, 1)`,
        );
        throw new Error('fallo simulado');
      }),
    ).rejects.toMatchObject({ code: 'DB_WRITE_FAILED' });

    const count = await ctx.manager.read((reader) =>
      reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM lists'),
    );
    expect(count?.count).toBe(0);
  });

  it('serializa escrituras concurrentes sin duplicar sort_order', async () => {
    const list = await ctx.deps.database.mutate(async (tx) => {
      await tx.run(
        `INSERT INTO lists (id, name, status, created_at_utc, updated_at_utc)
         VALUES ('list-1', 'Compra', 'draft', 1, 1)`,
      );
      return 'list-1';
    });

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        addItem(ctx.deps, list, `Artículo ${index + 1}`),
      ),
    );

    const items = await ctx.manager.read((reader) =>
      reader.all<{ sort_order: number }>(
        'SELECT sort_order FROM items WHERE list_id = ? ORDER BY sort_order',
        [list],
      ),
    );
    expect(items.map((item) => item.sort_order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });
});
