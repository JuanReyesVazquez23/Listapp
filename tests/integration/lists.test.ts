import { DatabaseManager } from '@/data/databaseManager';
import { addItem } from '@/useCases/items';
import { createList, deleteList, getListDetail, getListsOverview, renameList } from '@/useCases/lists';
import { NodeSqliteAdapter } from './nodeSqliteAdapter';
import { createTestContext, type TestContext } from './testContext';

describe('casos de uso de listas', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('crea una lista en draft con el nombre recortado', async () => {
    const list = await createList(ctx.deps, { name: '  Compra semanal  ' });

    expect(list).toMatchObject({
      name: 'Compra semanal',
      status: 'draft',
    });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.name).toBe('Compra semanal');
    expect(detail.items).toEqual([]);
  });

  it('rechaza nombres vacíos o demasiado largos sin escribir', async () => {
    await expect(createList(ctx.deps, { name: '   ' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await expect(createList(ctx.deps, { name: 'a'.repeat(81) })).rejects.toMatchObject({
      code: 'VALIDATION',
    });

    const overview = await getListsOverview(ctx.deps);
    expect(overview.drafts).toHaveLength(0);
  });

  it('permite dos listas con el mismo nombre', async () => {
    await createList(ctx.deps, { name: 'Compra' });
    await createList(ctx.deps, { name: 'Compra' });

    const overview = await getListsOverview(ctx.deps);
    expect(overview.drafts).toHaveLength(2);
  });

  it('ordena los borradores por actualización descendente', async () => {
    const first = await createList(ctx.deps, { name: 'Primera' });
    ctx.setNow(new Date('2026-10-28T09:00:00'));
    const second = await createList(ctx.deps, { name: 'Segunda' });

    let overview = await getListsOverview(ctx.deps);
    expect(overview.drafts.map((list) => list.id)).toEqual([second.id, first.id]);

    ctx.setNow(new Date('2026-10-29T09:00:00'));
    await renameList(ctx.deps, first.id, 'Primera renombrada');

    overview = await getListsOverview(ctx.deps);
    expect(overview.drafts.map((list) => list.id)).toEqual([first.id, second.id]);
  });

  it('renombra y persiste el cambio', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const renamed = await renameList(ctx.deps, list.id, '  Compra del sábado  ');

    expect(renamed.name).toBe('Compra del sábado');
    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.name).toBe('Compra del sábado');
  });

  it('borra la lista y sus artículos en cascada', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');

    await deleteList(ctx.deps, list.id);

    const lists = await ctx.manager.read((reader) =>
      reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM lists'),
    );
    const items = await ctx.manager.read((reader) =>
      reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM items'),
    );
    expect(lists?.count).toBe(0);
    expect(items?.count).toBe(0);
  });

  it('rechaza renombrar o borrar una lista completada', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
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

    await expect(renameList(ctx.deps, list.id, 'Otra')).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });
    await expect(deleteList(ctx.deps, list.id)).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.name).toBe('Compra');
  });

  it('devuelve NOT_FOUND para un id inexistente', async () => {
    await expect(getListDetail(ctx.deps, 'no-existe')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('mantiene la compra activa separada de los borradores', async () => {
    const draft = await createList(ctx.deps, { name: 'Borrador' });
    const shopping = await createList(ctx.deps, { name: 'En compra' });
    await ctx.manager.mutate((tx) =>
      tx.run("UPDATE lists SET status = 'shopping' WHERE id = ?", [shopping.id]),
    );

    const overview = await getListsOverview(ctx.deps);
    expect(overview.shopping?.id).toBe(shopping.id);
    expect(overview.drafts.map((list) => list.id)).toEqual([draft.id]);
  });

  it('persiste las listas al cerrar y reabrir la base', async () => {
    const list = await createList(ctx.deps, { name: 'Persistente' });
    await ctx.manager.close();

    const reopened = new DatabaseManager({
      openAdapter: () => NodeSqliteAdapter.open(ctx.dbPath),
    });
    await reopened.boot();
    const deps = { ...ctx.deps, database: reopened };
    const result = await getListsOverview(deps);

    expect(result.drafts.map((entry) => entry.id)).toEqual([list.id]);
    await reopened.close();
  });
});
