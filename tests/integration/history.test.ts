import { toLocalDateString, monthKey } from '@/domain/dates';
import {
  deleteCompletedListRow,
  findCompletedPurchaseSummaries,
  findRecentSupermarketNames,
} from '@/infrastructure/repositories/listsRepository';
import { addItem } from '@/useCases/items';
import { createList, getListDetail } from '@/useCases/lists';
import { finishPurchase, setItemChecked, startShopping } from '@/useCases/shopping';
import { createTestContext, type TestContext } from './testContext';

describe('consultas del historial', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  async function completePurchase(supermarketName: string, at: string): Promise<string> {
    ctx.setNow(new Date(at));
    const list = await createList(ctx.deps, { name: `Compra ${supermarketName}` });
    const item = await addItem(ctx.deps, list.id, 'Leche');
    await startShopping(ctx.deps, list.id);
    await setItemChecked(ctx.deps, item.id, true);
    await finishPurchase(ctx.deps, {
      listId: list.id,
      supermarketName,
      confirmZeroChecked: false,
    });
    return list.id;
  }

  it('lista las compras de la más reciente a la más antigua', async () => {
    const older = await completePurchase('Mercadona', '2026-09-30T10:00:00');
    const newer = await completePurchase('Lidl', '2026-10-27T18:42:00');

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);

    expect(history.map((row) => row.id)).toEqual([newer, older]);
    expect(history[0].completedAtUtc).toBeGreaterThan(history[1].completedAtUtc ?? 0);
  });

  it('solo devuelve las compras completadas en el historial', async () => {
    const completedId = await completePurchase('Mercadona', '2026-10-27T18:42:00');

    const draft = await createList(ctx.deps, { name: 'Borrador' });
    await addItem(ctx.deps, draft.id, 'Pan');

    const shopping = await createList(ctx.deps, { name: 'En compra' });
    await addItem(ctx.deps, shopping.id, 'Huevos');
    await startShopping(ctx.deps, shopping.id);

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);

    expect(history.map((row) => row.id)).toEqual([completedId]);
  });

  it('ordena 300 compras descendentes y las agrupa por mes', async () => {
    const start = new Date('2026-01-15T12:00:00').getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    // Se siembran las filas directamente: la prueba mide la consulta del
    // historial, no el flujo de finalización, que ya tiene sus propias pruebas.
    await ctx.manager.mutate(async (tx) => {
      for (let index = 0; index < 300; index += 1) {
        const completedAt = start + index * dayMs;
        const localDate = toLocalDateString(new Date(completedAt));
        await tx.run(
          `INSERT INTO lists (
             id, name, status, created_at_utc, updated_at_utc,
             completed_at_utc, completed_local_date, completed_local_time, supermarket_name
           ) VALUES (?, ?, 'completed', ?, ?, ?, ?, '10:30', 'Mercadona')`,
          [
            `list-${index}`,
            `Compra ${index}`,
            completedAt,
            completedAt,
            completedAt,
            localDate,
          ],
        );
      }
    });

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);

    expect(history).toHaveLength(300);
    expect(history[0].id).toBe('list-299');
    expect(history[299].id).toBe('list-0');

    const timestamps = history.map((row) => row.completedAtUtc ?? 0);
    expect(timestamps).toEqual([...timestamps].sort((left, right) => right - left));

    const months = history.map((row) => monthKey(row.completedLocalDate ?? ''));
    expect(months).toEqual([...months].sort().reverse());
  });

  it('sugiere supermercados recientes sin duplicar mayúsculas', async () => {
    await completePurchase('Mercadona', '2026-09-01T10:00:00');
    await completePurchase('Lidl', '2026-10-01T10:00:00');
    await completePurchase('MERCADONA', '2026-10-20T10:00:00');

    const names = await ctx.manager.read((reader) =>
      findRecentSupermarketNames(reader, 8),
    );
    expect(names).toEqual(['MERCADONA', 'Lidl']);

    const limited = await ctx.manager.read((reader) =>
      findRecentSupermarketNames(reader, 1),
    );
    expect(limited).toEqual(['MERCADONA']);
  });

  it('aplica el límite después de deduplicar', async () => {
    await completePurchase('B', '2026-10-01T10:00:00');
    await completePurchase('A', '2026-10-02T10:00:00');
    await completePurchase('A', '2026-10-03T10:00:00');

    const names = await ctx.manager.read((reader) =>
      findRecentSupermarketNames(reader, 2),
    );
    expect(names).toEqual(['A', 'B']);

    const none = await ctx.manager.read((reader) =>
      findRecentSupermarketNames(reader, 0),
    );
    expect(none).toEqual([]);
  });

  it('no distingue mayúsculas, incluidas las acentuadas, y conserva la grafía más reciente', async () => {
    await completePurchase('SÁNCHEZ', '2026-10-01T10:00:00');
    await completePurchase('Sánchez', '2026-10-02T10:00:00');

    const names = await ctx.manager.read((reader) =>
      findRecentSupermarketNames(reader, 8),
    );
    expect(names).toEqual(['Sánchez']);
  });

  it('no sugiere supermercados si no hay compras', async () => {
    const names = await ctx.manager.read((reader) =>
      findRecentSupermarketNames(reader, 8),
    );
    expect(names).toEqual([]);
  });

  it('elimina la compra y sus artículos en cascada', async () => {
    const listId = await completePurchase('Mercadona', '2026-10-27T18:42:00');

    const changes = await ctx.manager.mutate((tx) => deleteCompletedListRow(tx, listId));
    expect(changes).toBe(1);

    const counts = await ctx.manager.read(async (reader) => ({
      lists: await reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM lists'),
      items: await reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM items'),
    }));
    expect(counts.lists?.count).toBe(0);
    expect(counts.items?.count).toBe(0);

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);
    expect(history).toEqual([]);
  });

  it('no elimina por la vía del historial una lista que no está completada', async () => {
    const list = await createList(ctx.deps, { name: 'Borrador' });
    await addItem(ctx.deps, list.id, 'Leche');

    const changes = await ctx.manager.mutate((tx) => deleteCompletedListRow(tx, list.id));

    expect(changes).toBe(0);
    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('draft');
    expect(detail.items).toHaveLength(1);
  });
});
