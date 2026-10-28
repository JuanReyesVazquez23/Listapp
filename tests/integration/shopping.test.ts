import { DatabaseManager } from '@/infrastructure/databaseManager';
import { addItem } from '@/useCases/items';
import { createList, getListDetail } from '@/useCases/lists';
import { cancelShopping, setItemChecked, startShopping } from '@/useCases/shopping';
import { NodeSqliteAdapter } from './nodeSqliteAdapter';
import { createTestContext, type TestContext } from './testContext';

describe('modo compra', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('empieza la compra con al menos un artículo', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    await addItem(ctx.deps, list.id, 'Leche');
    ctx.setNow(new Date('2026-10-28T10:00:00'));

    const started = await startShopping(ctx.deps, list.id);

    expect(started.status).toBe('shopping');
    expect(started.updatedAtUtc).toBe(new Date('2026-10-28T10:00:00').getTime());

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('shopping');
  });

  it('rechaza empezar una lista vacía sin escribir', async () => {
    const list = await createList(ctx.deps, { name: 'Vacía' });

    await expect(startShopping(ctx.deps, list.id)).rejects.toMatchObject({
      code: 'EMPTY_LIST',
    });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('draft');
  });

  it('rechaza una segunda compra activa', async () => {
    const first = await createList(ctx.deps, { name: 'Primera' });
    const second = await createList(ctx.deps, { name: 'Segunda' });
    await addItem(ctx.deps, first.id, 'Leche');
    await addItem(ctx.deps, second.id, 'Pan');
    await startShopping(ctx.deps, first.id);

    await expect(startShopping(ctx.deps, second.id)).rejects.toMatchObject({
      code: 'ACTIVE_SHOPPING_EXISTS',
    });

    const detail = await getListDetail(ctx.deps, second.id);
    expect(detail.list.status).toBe('draft');
  });

  it('solo permite iniciar desde borrador', async () => {
    const shopping = await createList(ctx.deps, { name: 'En compra' });
    await addItem(ctx.deps, shopping.id, 'Leche');
    await startShopping(ctx.deps, shopping.id);

    await expect(startShopping(ctx.deps, shopping.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('marca y desmarca con estado absoluto y progreso', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const milk = await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');
    await addItem(ctx.deps, list.id, 'Huevos');
    await startShopping(ctx.deps, list.id);
    ctx.setNow(new Date('2026-10-28T11:00:00'));

    const checked = await setItemChecked(ctx.deps, milk.id, true);
    expect(checked.item.isChecked).toBe(true);
    expect(checked.item.checkedAtUtc).toBe(new Date('2026-10-28T11:00:00').getTime());
    expect(checked.progress).toMatchObject({ total: 3, checked: 1, label: '1 de 3' });

    const sameAgain = await setItemChecked(ctx.deps, milk.id, true);
    expect(sameAgain.item.isChecked).toBe(true);
    expect(sameAgain.progress.checked).toBe(1);

    const unchecked = await setItemChecked(ctx.deps, milk.id, false);
    expect(unchecked.item.isChecked).toBe(false);
    expect(unchecked.item.checkedAtUtc).toBeNull();
    expect(unchecked.progress).toMatchObject({ total: 3, checked: 0, label: '0 de 3' });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items.find((item) => item.id === milk.id)?.isChecked).toBe(false);
  });

  it('no permite marcar fuera de la compra', async () => {
    const list = await createList(ctx.deps, { name: 'Borrador' });
    const milk = await addItem(ctx.deps, list.id, 'Leche');

    await expect(setItemChecked(ctx.deps, milk.id, true)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.items[0].isChecked).toBe(false);
  });

  it('prohíbe marcar artículos de una compra finalizada', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const milk = await addItem(ctx.deps, list.id, 'Leche');
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

    await expect(setItemChecked(ctx.deps, milk.id, true)).rejects.toMatchObject({
      code: 'LIST_COMPLETED',
    });
  });

  it('cancelar desmarca todo y devuelve la lista a borrador', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const milk = await addItem(ctx.deps, list.id, 'Leche');
    const bread = await addItem(ctx.deps, list.id, 'Pan');
    await startShopping(ctx.deps, list.id);
    await setItemChecked(ctx.deps, milk.id, true);
    await setItemChecked(ctx.deps, bread.id, true);
    ctx.setNow(new Date('2026-10-28T12:00:00'));

    const cancelled = await cancelShopping(ctx.deps, list.id);

    expect(cancelled.status).toBe('draft');
    expect(cancelled.updatedAtUtc).toBe(new Date('2026-10-28T12:00:00').getTime());

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('draft');
    expect(detail.items.every((item) => !item.isChecked)).toBe(true);
    expect(detail.items.every((item) => item.checkedAtUtc === null)).toBe(true);
  });

  it('no permite cancelar una lista que no está en compra', async () => {
    const list = await createList(ctx.deps, { name: 'Borrador' });

    await expect(cancelShopping(ctx.deps, list.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('permite añadir artículos durante la compra', async () => {
    const list = await createList(ctx.deps, { name: 'Compra' });
    await addItem(ctx.deps, list.id, 'Leche');
    await startShopping(ctx.deps, list.id);

    const late = await addItem(ctx.deps, list.id, 'Servilletas');

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('shopping');
    expect(detail.items.map((item) => item.name)).toEqual(['Leche', 'Servilletas']);
    expect(late.sortOrder).toBe(2);
  });

  it('serializa dos inicios simultáneos y solo deja una compra activa', async () => {
    const first = await createList(ctx.deps, { name: 'Primera' });
    const second = await createList(ctx.deps, { name: 'Segunda' });
    await addItem(ctx.deps, first.id, 'Leche');
    await addItem(ctx.deps, second.id, 'Pan');

    const results = await Promise.allSettled([
      startShopping(ctx.deps, first.id),
      startShopping(ctx.deps, second.id),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: { code: 'ACTIVE_SHOPPING_EXISTS' },
    });
  });

  it('persiste estado y checks al cerrar y reabrir la base', async () => {
    const list = await createList(ctx.deps, { name: 'Persistente' });
    const milk = await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');
    await startShopping(ctx.deps, list.id);
    await setItemChecked(ctx.deps, milk.id, true);
    await ctx.manager.close();

    const reopened = new DatabaseManager({
      openAdapter: () => NodeSqliteAdapter.open(ctx.dbPath),
    });
    await reopened.boot();
    const deps = { ...ctx.deps, database: reopened };
    const detail = await getListDetail(deps, list.id);

    expect(detail.list.status).toBe('shopping');
    expect(detail.items.find((item) => item.id === milk.id)?.isChecked).toBe(true);
    expect(detail.items.find((item) => item.name === 'Pan')?.isChecked).toBe(false);
    await reopened.close();
  });
});
