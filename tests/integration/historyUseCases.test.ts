import {
  deletePurchase,
  getHistory,
  getPurchaseDetail,
  getSupermarketSuggestions,
} from '@/useCases/history';
import { addItem } from '@/useCases/items';
import { createList, getListDetail } from '@/useCases/lists';
import { finishPurchase, setItemChecked, startShopping } from '@/useCases/shopping';
import { createTestContext, type TestContext } from './testContext';

describe('casos de uso del historial', () => {
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
    const milk = await addItem(ctx.deps, list.id, 'Leche');
    await addItem(ctx.deps, list.id, 'Pan');
    await startShopping(ctx.deps, list.id, 'normal');
    await setItemChecked(ctx.deps, milk.id, true);
    await finishPurchase(ctx.deps, {
      listId: list.id,
      supermarketName,
      confirmZeroChecked: false,
    });
    return list.id;
  }

  it('devuelve solo compras cerradas, de la más reciente a la más antigua', async () => {
    const older = await completePurchase('Mercadona', '2026-09-30T10:00:00');
    const newer = await completePurchase('Lidl', '2026-10-27T18:42:00');

    const history = await getHistory(ctx.deps);

    expect(history.map((row) => row.id)).toEqual([newer, older]);
    expect(history[0]).toMatchObject({
      supermarketName: 'Lidl',
      completedLocalDate: '2026-10-27',
      completedLocalTime: '18:42',
      itemCount: 2,
      checkedCount: 1,
    });
  });

  it('devuelve el detalle de una compra con sus artículos', async () => {
    const listId = await completePurchase('Mercadona', '2026-10-27T18:42:00');

    const detail = await getPurchaseDetail(ctx.deps, listId);

    expect(detail.list.status).toBe('completed');
    expect(detail.items).toHaveLength(2);
    expect(detail.items[0].sortOrder).toBeLessThan(detail.items[1].sortOrder);
  });

  it('devuelve el detalle de una lista en cualquier estado y deja la redirección a la pantalla', async () => {
    const draft = await createList(ctx.deps, { name: 'Borrador' });
    await addItem(ctx.deps, draft.id, 'Leche');

    const detail = await getPurchaseDetail(ctx.deps, draft.id);

    expect(detail.list.status).toBe('draft');
    expect(detail.items).toHaveLength(1);
  });

  it('lanza NOT_FOUND si la lista del detalle no existe', async () => {
    await expect(getPurchaseDetail(ctx.deps, 'no-existe')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('elimina la compra y sus artículos en cascada', async () => {
    const listId = await completePurchase('Mercadona', '2026-10-27T18:42:00');

    await deletePurchase(ctx.deps, listId);

    await expect(getListDetail(ctx.deps, listId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await getHistory(ctx.deps)).toEqual([]);

    const counts = await ctx.manager.read(async (reader) => ({
      items: await reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM items'),
    }));
    expect(counts.items?.count).toBe(0);
  });

  it('lanza NOT_FOUND al borrar una compra inexistente', async () => {
    await expect(deletePurchase(ctx.deps, 'no-existe')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rechaza borrar un borrador con INVALID_STATE sin tocar datos', async () => {
    const draft = await createList(ctx.deps, { name: 'Borrador' });
    await addItem(ctx.deps, draft.id, 'Leche');

    await expect(deletePurchase(ctx.deps, draft.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });

    const detail = await getListDetail(ctx.deps, draft.id);
    expect(detail.list.status).toBe('draft');
    expect(detail.items).toHaveLength(1);
  });

  it('rechaza borrar una compra activa con INVALID_STATE sin tocar datos', async () => {
    const list = await createList(ctx.deps, { name: 'En compra' });
    await addItem(ctx.deps, list.id, 'Leche');
    await startShopping(ctx.deps, list.id, 'normal');

    await expect(deletePurchase(ctx.deps, list.id)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });

    const detail = await getListDetail(ctx.deps, list.id);
    expect(detail.list.status).toBe('shopping');
    expect(detail.items).toHaveLength(1);
  });

  it('sugiere como máximo 8 supermercados sin repetir grafías', async () => {
    for (let index = 1; index <= 9; index += 1) {
      await completePurchase(`Tienda ${index}`, `2026-10-0${index}T10:00:00`);
    }
    await completePurchase('TIENDA 9', '2026-10-10T10:00:00');

    const names = await getSupermarketSuggestions(ctx.deps, 8);

    expect(names).toHaveLength(8);
    expect(names[0]).toBe('TIENDA 9');
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(8);
  });
});
