import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DatabaseManager } from '@/infrastructure/databaseManager';
import { findCompletedPurchaseSummaries } from '@/infrastructure/repositories/listsRepository';
import type { SqlDatabase, SqlParams } from '@/infrastructure/sqlDatabase';
import { addItem } from '@/useCases/items';
import { createList, getListDetail, getListsOverview } from '@/useCases/lists';
import { finishPurchase, setItemChecked, startShopping } from '@/useCases/shopping';
import { NodeSqliteAdapter } from './nodeSqliteAdapter';
import { createTestContext, type TestContext } from './testContext';

describe('finalizar compra', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  async function startPurchaseWithItems(
    names: string[],
  ): Promise<{ listId: string; itemIds: string[] }> {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const itemIds: string[] = [];
    for (const name of names) {
      const item = await addItem(ctx.deps, list.id, name);
      itemIds.push(item.id);
    }
    await startShopping(ctx.deps, list.id, 'normal');
    return { listId: list.id, itemIds };
  }

  it('persiste estado, fecha local, hora y supermercado recortado', async () => {
    const { listId, itemIds } = await startPurchaseWithItems(['Leche', 'Pan']);
    await setItemChecked(ctx.deps, itemIds[0], true);
    ctx.setNow(new Date('2026-10-28T18:42:00'));
    const expectedNow = new Date('2026-10-28T18:42:00').getTime();

    const completed = await finishPurchase(ctx.deps, {
      listId,
      supermarketName: '  Mercadona  ',
      confirmZeroChecked: false,
    });

    expect(completed).toMatchObject({
      id: listId,
      status: 'completed',
      updatedAtUtc: expectedNow,
      completedAtUtc: expectedNow,
      completedLocalDate: '2026-10-28',
      completedLocalTime: '18:42',
      supermarketName: 'Mercadona',
    });

    const detail = await getListDetail(ctx.deps, listId);
    expect(detail.list).toMatchObject({
      status: 'completed',
      updatedAtUtc: expectedNow,
      completedAtUtc: expectedNow,
      completedLocalDate: '2026-10-28',
      completedLocalTime: '18:42',
      supermarketName: 'Mercadona',
    });
  });

  it('saca la compra de las listas activas y la coloca en el historial', async () => {
    const { listId, itemIds } = await startPurchaseWithItems(['Leche', 'Pan']);
    await setItemChecked(ctx.deps, itemIds[0], true);

    await finishPurchase(ctx.deps, {
      listId,
      supermarketName: 'Mercadona',
      confirmZeroChecked: false,
    });

    const overview = await getListsOverview(ctx.deps);
    expect(overview.shopping).toBeNull();
    expect(overview.drafts).toHaveLength(0);

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: listId,
      status: 'completed',
      supermarketName: 'Mercadona',
      itemCount: 2,
      checkedCount: 1,
    });
  });

  it('conserva los artículos sin comprar con is_checked = 0', async () => {
    const { listId, itemIds } = await startPurchaseWithItems(['Leche', 'Pan']);
    await setItemChecked(ctx.deps, itemIds[0], true);

    await finishPurchase(ctx.deps, {
      listId,
      supermarketName: 'Mercadona',
      confirmZeroChecked: false,
    });

    const rows = await ctx.manager.read((reader) =>
      reader.all<{ name: string; is_checked: number; checked_at_utc: number | null }>(
        `SELECT name, is_checked, checked_at_utc
           FROM items
          WHERE list_id = ?
          ORDER BY sort_order`,
        [listId],
      ),
    );

    expect(rows).toEqual([
      { name: 'Leche', is_checked: 1, checked_at_utc: expect.any(Number) },
      { name: 'Pan', is_checked: 0, checked_at_utc: null },
    ]);
  });

  it('no finaliza una lista que no existe', async () => {
    await expect(
      finishPurchase(ctx.deps, {
        listId: 'no-existe',
        supermarketName: 'Mercadona',
        confirmZeroChecked: false,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('no finaliza una lista en borrador', async () => {
    const list = await createList(ctx.deps, { name: 'Borrador' });
    await addItem(ctx.deps, list.id, 'Leche');

    await expect(
      finishPurchase(ctx.deps, {
        listId: list.id,
        supermarketName: 'Mercadona',
        confirmZeroChecked: false,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('draft');
    expect(detail.list.completedAtUtc).toBeNull();
  });

  it('no finaliza una compra sin artículos', async () => {
    const list = await createList(ctx.deps, { name: 'Sin artículos' });
    // El flujo normal no permite llegar a compra sin artículos; se fuerza el
    // estado para ejercitar la defensa del algoritmo.
    await ctx.manager.mutate((tx) =>
      tx.run("UPDATE lists SET status = 'shopping' WHERE id = ?", [list.id]),
    );

    await expect(
      finishPurchase(ctx.deps, {
        listId: list.id,
        supermarketName: 'Mercadona',
        confirmZeroChecked: true,
      }),
    ).rejects.toMatchObject({ code: 'EMPTY_LIST' });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('shopping');
    expect(detail.list.supermarketName).toBeNull();
  });

  it('exige confirmación cuando no hay artículos marcados', async () => {
    const { listId } = await startPurchaseWithItems(['Leche', 'Pan']);

    await expect(
      finishPurchase(ctx.deps, {
        listId,
        supermarketName: 'Mercadona',
        confirmZeroChecked: false,
      }),
    ).rejects.toMatchObject({ code: 'NO_CHECKED' });

    const stillShopping = await getListDetail(ctx.deps, listId);
    expect(stillShopping.list.status).toBe('shopping');
    expect(stillShopping.list.completedAtUtc).toBeNull();

    const completed = await finishPurchase(ctx.deps, {
      listId,
      supermarketName: 'Mercadona',
      confirmZeroChecked: true,
    });
    expect(completed.status).toBe('completed');

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);
    expect(history[0].checkedCount).toBe(0);
  });

  it('prioriza NO_CHECKED sobre la validación del supermercado', async () => {
    const { listId } = await startPurchaseWithItems(['Leche', 'Pan']);

    await expect(
      finishPurchase(ctx.deps, {
        listId,
        supermarketName: '',
        confirmZeroChecked: false,
      }),
    ).rejects.toMatchObject({ code: 'NO_CHECKED' });

    const detail = await getListDetail(ctx.deps, listId);
    expect(detail.list.status).toBe('shopping');
    expect(detail.list.supermarketName).toBeNull();
  });

  it('rechaza supermercados vacíos, solo espacios o de 81 caracteres sin escribir', async () => {
    const { listId, itemIds } = await startPurchaseWithItems(['Leche']);
    await setItemChecked(ctx.deps, itemIds[0], true);
    const before = await getListDetail(ctx.deps, listId);

    for (const supermarketName of ['', '    ', 'a'.repeat(81)]) {
      await expect(
        finishPurchase(ctx.deps, {
          listId,
          supermarketName,
          confirmZeroChecked: false,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        details: { field: 'supermarketName' },
      });
    }

    const after = await getListDetail(ctx.deps, listId);
    expect(after.list).toEqual(before.list);
    expect(after.list.status).toBe('shopping');
  });

  it('finalizar dos veces devuelve la misma compra sin escribir', async () => {
    const { listId, itemIds } = await startPurchaseWithItems(['Leche']);
    await setItemChecked(ctx.deps, itemIds[0], true);
    ctx.setNow(new Date('2026-10-28T18:42:00'));
    const firstNow = new Date('2026-10-28T18:42:00').getTime();

    const first = await finishPurchase(ctx.deps, {
      listId,
      supermarketName: 'Mercadona',
      confirmZeroChecked: false,
    });
    expect(first.completedAtUtc).toBe(firstNow);

    ctx.setNow(new Date('2026-10-30T09:00:00'));
    const second = await finishPurchase(ctx.deps, {
      listId,
      supermarketName: 'Lidl',
      confirmZeroChecked: true,
    });

    expect(second).toMatchObject({
      id: listId,
      status: 'completed',
      completedAtUtc: firstNow,
      updatedAtUtc: firstNow,
      supermarketName: 'Mercadona',
    });

    const detail = await getListDetail(ctx.deps, listId);
    expect(detail.list.updatedAtUtc).toBe(firstNow);
    expect(detail.list.supermarketName).toBe('Mercadona');
  });

  it('revierte la finalización y deja la lista en compra si falla el COMMIT', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'listapp-commit-'));
    const adapter = new FailingCommitAdapter(NodeSqliteAdapter.open(join(dir, 'test.db')));
    const manager = new DatabaseManager({ openAdapter: () => Promise.resolve(adapter) });
    await manager.boot();
    const deps = { ...ctx.deps, database: manager };

    try {
      const list = await createList(deps, { name: 'Compra' });
      const item = await addItem(deps, list.id, 'Leche');
      await startShopping(deps, list.id, 'normal');
      await setItemChecked(deps, item.id, true);

      adapter.failNextCommit();

      await expect(
        finishPurchase(deps, {
          listId: list.id,
          supermarketName: 'Mercadona',
          confirmZeroChecked: false,
        }),
      ).rejects.toMatchObject({ code: 'DB_WRITE_FAILED' });

      const detail = await getListDetail(deps, list.id);
      expect(detail.list.status).toBe('shopping');
      expect(detail.list.completedAtUtc).toBeNull();
      expect(detail.list.completedLocalDate).toBeNull();
      expect(detail.list.supermarketName).toBeNull();
    } finally {
      await manager.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * Simula un COMMIT que falla después de que la transacción ya escribió.
 *
 * Es el caso que cubre el contrato de recuperación: el ROLLBACK debe
 * deshacer la escritura y la conexión queda usable tras la sonda.
 */
class FailingCommitAdapter implements SqlDatabase {
  private shouldFailNextCommit = false;

  constructor(private readonly inner: SqlDatabase) {}

  failNextCommit(): void {
    this.shouldFailNextCommit = true;
  }

  async exec(sql: string): Promise<void> {
    if (sql === 'COMMIT' && this.shouldFailNextCommit) {
      this.shouldFailNextCommit = false;
      throw new Error('fallo simulado en COMMIT');
    }
    return this.inner.exec(sql);
  }

  run(sql: string, params?: SqlParams) {
    return this.inner.run(sql, params);
  }

  get<T>(sql: string, params?: SqlParams) {
    return this.inner.get<T>(sql, params);
  }

  all<T>(sql: string, params?: SqlParams) {
    return this.inner.all<T>(sql, params);
  }

  close(): Promise<void> {
    return this.inner.close();
  }
}
