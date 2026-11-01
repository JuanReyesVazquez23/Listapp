import {
  canAddItem,
  canCancelShopping,
  canDeleteItem,
  canDeleteList,
  canDeletePurchase,
  canFinishPurchase,
  canRenameItem,
  canRenameList,
  canRestoreItem,
  canSaveItemDetail,
  canStartShopping,
  canToggleItem,
  isEditable,
} from '@/domain/lifecycle';

describe('reglas de ciclo de vida', () => {
  it('draft y shopping son editables; completed no', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('shopping')).toBe(true);
    expect(isEditable('completed')).toBe(false);
  });

  it('prohíbe editar o borrar una lista completada', () => {
    expect(canRenameList({ status: 'draft' })).toBeNull();
    expect(canRenameList({ status: 'shopping' })).toBeNull();
    expect(canRenameList({ status: 'completed' })).toBe('LIST_COMPLETED');
    expect(canDeleteList({ status: 'completed' })).toBe('LIST_COMPLETED');
    expect(canAddItem({ status: 'completed' })).toBe('LIST_COMPLETED');
    expect(canRenameItem({ status: 'completed' })).toBe('LIST_COMPLETED');
    expect(canRestoreItem({ status: 'completed' })).toBe('LIST_COMPLETED');
  });

  it('no permite borrar el último artículo durante la compra', () => {
    expect(canDeleteItem({ status: 'shopping' }, 1)).toBe('LAST_ITEM_IN_SHOPPING');
    expect(canDeleteItem({ status: 'shopping' }, 2)).toBeNull();
    expect(canDeleteItem({ status: 'draft' }, 1)).toBeNull();
  });

  it('solo se marca durante la compra', () => {
    expect(canToggleItem({ status: 'shopping' })).toBeNull();
    expect(canToggleItem({ status: 'draft' })).toBe('INVALID_STATE');
    expect(canToggleItem({ status: 'completed' })).toBe('LIST_COMPLETED');
  });

  it('empezar compra exige borrador, artículos y ninguna compra activa', () => {
    expect(canStartShopping({ status: 'draft' }, 1, false)).toBeNull();
    expect(canStartShopping({ status: 'draft' }, 0, false)).toBe('EMPTY_LIST');
    expect(canStartShopping({ status: 'draft' }, 1, true)).toBe('ACTIVE_SHOPPING_EXISTS');
    expect(canStartShopping({ status: 'shopping' }, 1, false)).toBe('INVALID_STATE');
    expect(canStartShopping({ status: 'completed' }, 1, false)).toBe('LIST_COMPLETED');
  });

  it('cancelar solo aplica a una compra activa', () => {
    expect(canCancelShopping({ status: 'shopping' })).toBeNull();
    expect(canCancelShopping({ status: 'draft' })).toBe('INVALID_STATE');
    expect(canCancelShopping({ status: 'completed' })).toBe('LIST_COMPLETED');
  });

  it('finalizar exige compra en curso, artículos y confirmación si no hay marcados', () => {
    expect(canFinishPurchase({ status: 'shopping' }, 3, 1, false)).toBeNull();
    expect(canFinishPurchase({ status: 'shopping' }, 3, 0, true)).toBeNull();
    expect(canFinishPurchase({ status: 'shopping' }, 3, 0, false)).toBe('NO_CHECKED');
    expect(canFinishPurchase({ status: 'shopping' }, 0, 0, true)).toBe('EMPTY_LIST');
    expect(canFinishPurchase({ status: 'draft' }, 3, 1, false)).toBe('INVALID_STATE');
    expect(canFinishPurchase({ status: 'completed' }, 3, 1, false)).toBe('LIST_COMPLETED');
  });

  it('evalúa las guardas de finalizar en orden: estado, artículos y marcados', () => {
    expect(canFinishPurchase({ status: 'shopping' }, 0, 0, false)).toBe('EMPTY_LIST');
    expect(canFinishPurchase({ status: 'draft' }, 3, 0, false)).toBe('INVALID_STATE');
    expect(canFinishPurchase({ status: 'completed' }, 3, 0, false)).toBe('LIST_COMPLETED');
  });

  it('solo se elimina una compra completada', () => {
    expect(canDeletePurchase({ status: 'completed' })).toBeNull();
    expect(canDeletePurchase({ status: 'draft' })).toBe('INVALID_STATE');
    expect(canDeletePurchase({ status: 'shopping' })).toBe('INVALID_STATE');
  });

  it('solo guarda detalle en una compra en curso de catálogo', () => {
    expect(canSaveItemDetail({ status: 'shopping', shoppingMode: 'catalog' })).toBeNull();
    expect(canSaveItemDetail({ status: 'shopping', shoppingMode: 'normal' })).toBe(
      'INVALID_STATE',
    );
    expect(canSaveItemDetail({ status: 'shopping', shoppingMode: null })).toBe(
      'INVALID_STATE',
    );
    expect(canSaveItemDetail({ status: 'draft', shoppingMode: null })).toBe('INVALID_STATE');
    expect(canSaveItemDetail({ status: 'completed', shoppingMode: 'catalog' })).toBe(
      'LIST_COMPLETED',
    );
  });
});
