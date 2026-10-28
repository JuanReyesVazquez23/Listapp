import { DatabaseManager } from '@/data/databaseManager';
import { addItem, deleteItem, renameItem, restoreItem } from '@/useCases/items';
import { createList, getListDetail } from '@/useCases/lists';
import { NodeSqliteAdapter } from './nodeSqliteAdapter';
import { createTestContext, type TestContext } from './testContext';

describe('casos de uso de artículos', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('añade artículos al final con sort_order consecutivo', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });

    const milk = await addItem(ctx.deps, list.id, '  Leche  ');
    const bread = await addItem(ctx.deps, list.id, 'Pan');
    const eggs = await addItem(ctx.deps, list.id, 'Huevos');

    expect(milk.name).toBe('Leche');
    expect([milk.sortOrder, bread.sortOrder, eggs.sortOrder]).toEqual([1, 2, 3]);

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items.map((item) => item.name)).toEqual(['Leche', 'Pan', 'Huevos']);
  });

  it('rechaza nombres vacíos y demasiado largos', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });

    await expect(addItem(ctx.deps, list.id, '   ')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await expect(addItem(ctx.deps, list.id, 'a'.repeat(101))).rejects.toMatchObject({
      code: 'VALIDATION',
    });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items).toHaveLength(0);
  });

  it('actualiza la fecha de la lista al modificarla', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    ctx.setNow(new Date('2026-10-28T10:00:00'));
    await addItem(ctx.deps, list.id, 'Leche');

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.updatedAtUtc).toBe(new Date('2026-10-28T10:00:00').getTime());
  });

  it('renombra sin cambiar la posición', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const first = await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');

    const renamed = await renameItem(ctx.deps, first.id, 'Leche entera');
    expect(renamed.sortOrder).toBe(1);

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items.map((item) => item.name)).toEqual(['Leche entera', 'Pan']);
  });

  it('borrar el del medio no renumera los demás', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    await addItem(ctx.deps, list.id, 'A');
    const middle = await addItem(ctx.deps, list.id, 'B');
    const last = await addItem(ctx.deps, list.id, 'C');

    await deleteItem(ctx.deps, middle.id);

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items.map((item) => item.name)).toEqual(['A', 'C']);
    expect(detail.items.map((item) => item.sortOrder)).toEqual([1, last.sortOrder]);
  });

  it('deshacer restaura nombre, estado y posición', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    await addItem(ctx.deps, list.id, 'A');
    const middle = await addItem(ctx.deps, list.id, 'B');
    await addItem(ctx.deps, list.id, 'C');

    const deleted = await deleteItem(ctx.deps, middle.id);
    const restored = await restoreItem(ctx.deps, deleted);

    expect(restored.id).toBe(middle.id);
    expect(restored.sortOrder).toBe(2);

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items.map((item) => item.name)).toEqual(['A', 'B', 'C']);
  });

  it('deshacer añade al final si la posición está ocupada', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    await addItem(ctx.deps, list.id, 'A');
    const middle = await addItem(ctx.deps, list.id, 'B');
    const last = await addItem(ctx.deps, list.id, 'C');

    const deleted = await deleteItem(ctx.deps, middle.id);
    await ctx.manager.mutate((tx) =>
      tx.run('UPDATE items SET sort_order = 2 WHERE id = ?', [last.id]),
    );

    const restored = await restoreItem(ctx.deps, deleted);
    expect(restored.sortOrder).toBe(3);

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items.map((item) => item.name)).toEqual(['A', 'C', 'B']);
  });

  it('no permite borrar el último artículo durante la compra', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const only = await addItem(ctx.deps, list.id, 'Leche');
    await ctx.manager.mutate((tx) =>
      tx.run("UPDATE lists SET status = 'shopping' WHERE id = ?", [list.id]),
    );

    await expect(deleteItem(ctx.deps, only.id)).rejects.toMatchObject({
      code: 'LAST_ITEM_IN_SHOPPING',
    });
  });

  it('prohíbe modificar artículos de una lista completada', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const item = await addItem(ctx.deps, list.id, 'Leche');
    await ctx.manager.mutate((tx) =>
      tx.run(
        `UPDATE lists
            SET status = 'completed', completed_at_utc = 1,
                completed_local_date = '2026-10-27',
                completed_local_time = '18:42', supermarket_name = 'Mercadona'
          WHERE id = ?`,
        [list.id],
      ),
    );

    await expect(addItem(ctx.deps, list.id, 'Pan')).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });
    await expect(renameItem(ctx.deps, item.id, 'Otra')).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });
    await expect(deleteItem(ctx.deps, item.id)).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });
    await expect(restoreItem(ctx.deps, item)).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });
  });

  it('deshacer falla sin escribir si la lista se completó mientras tanto', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const first = await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');
    await ctx.manager.mutate((tx) =>
      tx.run("UPDATE lists SET status = 'shopping' WHERE id = ?", [list.id]),
    );

    const deleted = await deleteItem(ctx.deps, first.id);
    await ctx.manager.mutate((tx) =>
      tx.run(
        `UPDATE lists
            SET status = 'completed', completed_at_utc = 1,
                completed_local_date = '2026-10-27',
                completed_local_time = '18:42', supermarket_name = 'Mercadona'
          WHERE id = ?`,
        [list.id],
      ),
    );

    await expect(restoreItem(ctx.deps, deleted)).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });

    const count = await ctx.manager.read((reader) =>
      reader.get<{ count: number }>(
        'SELECT COUNT(*) AS count FROM items WHERE list_id = ?',
        [list.id],
      ),
    );
    expect(count?.count).toBe(1);
  });

  it('no escribe dos veces el mismo deshacer', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const item = await addItem(ctx.deps, list.id, 'Leche');
    const deleted = await deleteItem(ctx.deps, item.id);
    await restoreItem(ctx.deps, deleted);

    await expect(restoreItem(ctx.deps, deleted)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('persiste los artículos al cerrar y reabrir la base', async () => {
    const list = await createList(ctx.deps, { name: 'Persistente' });
    const milk = await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');
    await renameItem(ctx.deps, milk.id, 'Leche entera');
    await ctx.manager.close();

    const reopened = new DatabaseManager({
      openAdapter: () => NodeSqliteAdapter.open(ctx.dbPath),
    });
    await reopened.boot();
    const deps = { ...ctx.deps, database: reopened };
    const detail = await getListDetail(deps, list.id);

    expect(detail.items.map((item) => item.name)).toEqual(['Leche entera', 'Pan']);
    await reopened.close();
  });
});
