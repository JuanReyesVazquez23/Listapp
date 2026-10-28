import {
  canAddItem,
  canCancelShopping,
  canDeleteItem,
  canDeleteList,
  canRenameItem,
  canRenameList,
  canRestoreItem,
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
});
