import { splitPurchaseItems } from '@/domain/purchase';
import type { ShoppingItem } from '@/domain/item';

function item(id: string, isChecked: boolean): ShoppingItem {
  return {
    id,
    listId: 'list-1',
    name: id,
    isChecked,
    checkedAtUtc: isChecked ? 10 : null,
    sortOrder: 1,
    createdAtUtc: 1,
    updatedAtUtc: 1,
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
