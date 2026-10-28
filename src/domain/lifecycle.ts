import type { ListStatus, ShoppingList } from '@/domain/list';

export type GuardFailure =
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'LIST_COMPLETED'
  | 'ACTIVE_SHOPPING_EXISTS'
  | 'LAST_ITEM_IN_SHOPPING'
  | 'EMPTY_LIST'
  | 'NO_CHECKED';

type StatusLike = Pick<ShoppingList, 'status'>;

function editable(status: ListStatus): GuardFailure | null {
  return status === 'completed' ? 'LIST_COMPLETED' : null;
}

export function isEditable(status: ListStatus): boolean {
  return status !== 'completed';
}

export function canRenameList(list: StatusLike): GuardFailure | null {
  return editable(list.status);
}

/** La eliminación de una compra completada se hace desde Historial, no desde la lista. */
export function canDeleteList(list: StatusLike): GuardFailure | null {
  return editable(list.status);
}

export function canAddItem(list: StatusLike): GuardFailure | null {
  return editable(list.status);
}

export function canRenameItem(list: StatusLike): GuardFailure | null {
  return editable(list.status);
}

export function canRestoreItem(list: StatusLike): GuardFailure | null {
  return editable(list.status);
}

export function canDeleteItem(list: StatusLike, itemCount: number): GuardFailure | null {
  const editFailure = editable(list.status);
  if (editFailure) {
    return editFailure;
  }
  if (list.status === 'shopping' && itemCount <= 1) {
    return 'LAST_ITEM_IN_SHOPPING';
  }
  return null;
}

export function canToggleItem(list: StatusLike): GuardFailure | null {
  if (list.status === 'shopping') {
    return null;
  }
  return list.status === 'completed' ? 'LIST_COMPLETED' : 'INVALID_STATE';
}

export function canStartShopping(
  list: StatusLike,
  itemCount: number,
  hasActiveShopping: boolean,
): GuardFailure | null {
  if (list.status === 'completed') {
    return 'LIST_COMPLETED';
  }
  if (list.status !== 'draft') {
    return 'INVALID_STATE';
  }
  if (itemCount < 1) {
    return 'EMPTY_LIST';
  }
  if (hasActiveShopping) {
    return 'ACTIVE_SHOPPING_EXISTS';
  }
  return null;
}

export function canCancelShopping(list: StatusLike): GuardFailure | null {
  if (list.status === 'shopping') {
    return null;
  }
  return list.status === 'completed' ? 'LIST_COMPLETED' : 'INVALID_STATE';
}
