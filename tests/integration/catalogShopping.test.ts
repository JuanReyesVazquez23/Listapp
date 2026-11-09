import { findCompletedPurchaseSummaries } from '@/infrastructure/repositories/listsRepository';
import type { ItemDetailInput } from '@/domain/item';
import { addItem, getItemForDetail } from '@/useCases/items';
import { createList, getListDetail } from '@/useCases/lists';
import {
  cancelShopping,
  checkItem,
  finishPurchase,
  setItemChecked,
  startShopping,
  updateItemDetail,
} from '@/useCases/shopping';
import { createTestContext, type TestContext } from './testContext';

const priced: ItemDetailInput = {
  brand: 'Bimbo',
  quantityMilli: 1500,
  unit: 'pound',
  unitPriceCents: 200,
  catalogProductId: '12345',
};

describe('compra con catálogo', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  async function startCatalogPurchase(names: string[]) {
    const list = await createList(ctx.deps, { name: 'Compra' });
    const items = [];
    for (const name of names) {
      items.push(await addItem(ctx.deps, list.id, name));
    }
    const started = await startShopping(ctx.deps, list.id, 'catalog');
    return { listId: list.id, items, started };
  }

  it('fija el modo catálogo al empezar y lo conserva en el detalle', async () => {
    const { listId, started } = await startCatalogPurchase(['Pan']);

    expect(started.shoppingMode).toBe('catalog');
    const detail = await getListDetail(ctx.deps, listId);
    expect(detail.list.shoppingMode).toBe('catalog');
  });

  it('marca con detalle y calcula la línea con un solo redondeo', async () => {
    const { items } = await startCatalogPurchase(['Pan']);
    ctx.setNow(new Date('2026-10-28T10:00:00'));

    const result = await checkItem(ctx.deps, items[0].id, priced);

    expect(result.item).toMatchObject({
      isChecked: true,
      detail: {
        brand: 'Bimbo',
        quantityMilli: 1500,
        unit: 'pound',
        unitPriceCents: 200,
        lineSubtotalCents: 300,
        catalogProductId: '12345',
      },
    });
  });

  it('guarda el total de las líneas con precio al finalizar', async () => {
    const { listId, items } = await startCatalogPurchase(['Pan', 'Leche']);
    await checkItem(ctx.deps, items[0].id, priced);
    await checkItem(ctx.deps, items[1].id, {
      ...priced,
      brand: 'Rica',
      quantityMilli: 2000,
      unit: 'liter',
      unitPriceCents: 125,
      catalogProductId: '67890',
    });

    const completed = await finishPurchase(ctx.deps, {
      listId,
      confirmZeroChecked: false,
    });

    // 1.5 × 2.00 = 3.00 y 2 × 1.25 = 2.50.
    expect(completed.totalCents).toBe(550);

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);
    expect(history[0]).toMatchObject({
      shoppingMode: 'catalog',
      totalCents: 550,
      unpricedCheckedCount: 0,
    });
  });

  it('deja el total en NULL si ninguna línea tiene precio', async () => {
    const { listId, items } = await startCatalogPurchase(['Pan']);
    await checkItem(ctx.deps, items[0].id, null);

    const completed = await finishPurchase(ctx.deps, {
      listId,
      confirmZeroChecked: false,
    });

    expect(completed.totalCents).toBeNull();
    const history = await ctx.manager.read(findCompletedPurchaseSummaries);
    expect(history[0].unpricedCheckedCount).toBe(1);
  });

  it('marca el total como parcial si conviven líneas con y sin precio', async () => {
    const { listId, items } = await startCatalogPurchase(['Pan', 'Leche']);
    await checkItem(ctx.deps, items[0].id, priced);
    await checkItem(ctx.deps, items[1].id, null);

    await finishPurchase(ctx.deps, {
      listId,
      confirmZeroChecked: false,
    });

    const history = await ctx.manager.read(findCompletedPurchaseSummaries);
    expect(history[0]).toMatchObject({
      totalCents: 300,
      unpricedCheckedCount: 1,
    });
  });

  it('borra el detalle al desmarcar el artículo', async () => {
    const { items } = await startCatalogPurchase(['Pan']);
    await checkItem(ctx.deps, items[0].id, priced);

    await setItemChecked(ctx.deps, items[0].id, false);

    const context = await getItemForDetail(ctx.deps, items[0].id);
    expect(context.item.isChecked).toBe(false);
    expect(context.item.detail).toBeNull();
  });

  it('quita los datos sin desmarcar y permite volver a ponerlos', async () => {
    const { items } = await startCatalogPurchase(['Pan']);
    await checkItem(ctx.deps, items[0].id, priced);

    await updateItemDetail(ctx.deps, items[0].id, null);
    const withoutDetail = await getItemForDetail(ctx.deps, items[0].id);
    expect(withoutDetail.item.isChecked).toBe(true);
    expect(withoutDetail.item.detail).toBeNull();

    await updateItemDetail(ctx.deps, items[0].id, {
      ...priced,
      quantityMilli: 500,
    });
    const restored = await getItemForDetail(ctx.deps, items[0].id);
    expect(restored.item.detail).toMatchObject({
      quantityMilli: 500,
      lineSubtotalCents: 100,
    });
  });

  it('cancelar devuelve la lista a borrador y limpia modo y detalles', async () => {
    const { listId, items } = await startCatalogPurchase(['Pan']);
    await checkItem(ctx.deps, items[0].id, priced);

    const cancelled = await cancelShopping(ctx.deps, listId);

    expect(cancelled).toMatchObject({ status: 'draft', shoppingMode: null, totalCents: null });
    const detail = await getListDetail(ctx.deps, listId);
    expect(detail.items[0]).toMatchObject({ isChecked: false, detail: null });
  });

  it('rechaza marcar con detalle en una compra normal', async () => {
    const list = await createList(ctx.deps, { name: 'Normal' });
    const item = await addItem(ctx.deps, list.id, 'Pan');
    await startShopping(ctx.deps, list.id, 'normal');

    await expect(checkItem(ctx.deps, item.id, priced)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });
});
