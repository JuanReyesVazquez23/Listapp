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

type DetailLike = Pick<ShoppingList, 'status' | 'shoppingMode'>;

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

/**
 * El detalle de una línea solo se guarda en una compra en curso de catálogo.
 *
 * La compra normal no tiene precio ni cantidad editables; una compra cerrada
 * es historial inmutable. La UI usa la misma guarda para abrir el modal, y
 * los casos de uso la repiten dentro de la transacción.
 */
export function canSaveItemDetail(list: DetailLike): GuardFailure | null {
  if (list.status === 'completed') {
    return 'LIST_COMPLETED';
  }
  if (list.status !== 'shopping' || list.shoppingMode !== 'catalog') {
    return 'INVALID_STATE';
  }
  return null;
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

/**
 * Finalizar exige una compra en curso, con artículos y, si no hay ninguno
 * marcado, una confirmación explícita del usuario.
 *
 * El caso de uso resuelve antes una lista ya `completed` como éxito
 * idempotente; si se invoca esta guarda sin ese atajo, devuelve
 * `LIST_COMPLETED` igual que las demás transiciones.
 */
export function canFinishPurchase(
  list: StatusLike,
  itemCount: number,
  checkedCount: number,
  confirmZeroChecked: boolean,
): GuardFailure | null {
  if (list.status === 'completed') {
    return 'LIST_COMPLETED';
  }
  if (list.status !== 'shopping') {
    return 'INVALID_STATE';
  }
  if (itemCount < 1) {
    return 'EMPTY_LIST';
  }
  if (checkedCount === 0 && !confirmZeroChecked) {
    return 'NO_CHECKED';
  }
  return null;
}

/**
 * Solo una compra completada se elimina, y solo desde el historial.
 * Una lista activa se borra por la ruta de listas, con su propia guarda.
 */
export function canDeletePurchase(list: StatusLike): GuardFailure | null {
  return list.status === 'completed' ? null : 'INVALID_STATE';
}
