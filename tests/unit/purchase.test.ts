import type { ShoppingItem } from '@/domain/item';
import { computePurchaseTotal, splitPurchaseItems } from '@/domain/purchase';

function item(
  id: string,
  isChecked: boolean,
  lineSubtotalCents: number | null = null,
): ShoppingItem {
  return {
    id,
    listId: 'list-1',
    name: id,
    isChecked,
    checkedAtUtc: isChecked ? 10 : null,
    sortOrder: 1,
    createdAtUtc: 1,
    updatedAtUtc: 1,
    detail:
      lineSubtotalCents === null
        ? null
        : {
            brand: null,
            quantityMilli: 1000,
            unit: 'unit',
            unitPriceCents: lineSubtotalCents,
            lineSubtotalCents,
            catalogProductId: null,
          },
  };
}

describe('splitPurchaseItems', () => {
  it('separa comprados y sin comprar conservando el orden', () => {
    const split = splitPurchaseItems([
      item('leche', true),
      item('pan', false),
      item('huevos', true),
    ]);

    expect(split.purchased.map((entry) => entry.id)).toEqual(['leche', 'huevos']);
    expect(split.notPurchased.map((entry) => entry.id)).toEqual(['pan']);
  });

  it('devuelve grupos vacíos cuando todos los artículos están en el mismo estado', () => {
    expect(splitPurchaseItems([item('leche', true)]).notPurchased).toEqual([]);
    expect(splitPurchaseItems([item('leche', false)]).purchased).toEqual([]);
    expect(splitPurchaseItems([])).toEqual({ purchased: [], notPurchased: [] });
  });
});

describe('computePurchaseTotal', () => {
  it('no inventa un total cuando no hay líneas marcadas', () => {
    expect(computePurchaseTotal([])).toEqual({
      totalCents: null,
      pricedCount: 0,
      unpricedCount: 0,
      isPartial: false,
    });
    expect(computePurchaseTotal([item('leche', false), item('pan', false, 500)])).toEqual({
      totalCents: null,
      pricedCount: 0,
      unpricedCount: 0,
      isPartial: false,
    });
  });

  it('devuelve total nulo cuando todos los marcados están sin precio', () => {
    expect(computePurchaseTotal([item('leche', true), item('pan', true)])).toEqual({
      totalCents: null,
      pricedCount: 0,
      unpricedCount: 2,
      isPartial: false,
    });
  });

  it('marca el total como parcial cuando conviven líneas con y sin precio', () => {
    expect(
      computePurchaseTotal([item('leche', true, 1250), item('pan', true)]),
    ).toEqual({
      totalCents: 1250,
      pricedCount: 1,
      unpricedCount: 1,
      isPartial: true,
    });
  });

  it('suma los subtotales cuando todos los marcados tienen precio', () => {
    expect(
      computePurchaseTotal([
        item('leche', true, 1250),
        item('pan', true, 175),
        item('huevos', false, 900),
      ]),
    ).toEqual({
      totalCents: 1425,
      pricedCount: 2,
      unpricedCount: 0,
      isPartial: false,
    });
  });

  it('acepta un total de cero como exacto', () => {
    expect(computePurchaseTotal([item('bolsa', true, 0)])).toEqual({
      totalCents: 0,
      pricedCount: 1,
      unpricedCount: 0,
      isPartial: false,
    });
  });

  it('mantiene parcial un subtotal cero junto a una línea sin precio', () => {
    expect(
      computePurchaseTotal([item('bolsa', true, 0), item('leche', true)]),
    ).toEqual({
      totalCents: 0,
      pricedCount: 1,
      unpricedCount: 1,
      isPartial: true,
    });
  });

  it('ignora las líneas sin marcar al calcular el total', () => {
    expect(
      computePurchaseTotal([
        item('leche', true, 1000),
        item('pan', false, 500),
        item('huevos', false),
      ]),
    ).toEqual({
      totalCents: 1000,
      pricedCount: 1,
      unpricedCount: 0,
      isPartial: false,
    });
  });
});
