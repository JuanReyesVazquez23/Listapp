import { isAppError } from '@/lib/errors';
import { es } from '@/strings/es';

/** Traduce un error de dominio o de base de datos a un mensaje para el usuario. */
export function toUserMessage(error: unknown, fallback: string = es.errors.generic): string {
  if (!isAppError(error)) {
    return fallback;
  }

  switch (error.code) {
    case 'VALIDATION':
      return error.message;
    case 'NOT_FOUND':
      return es.errors.listNotFound;
    case 'INVALID_STATE':
      return es.errors.invalidState;
    case 'LIST_COMPLETED':
      return es.errors.listCompleted;
    case 'ACTIVE_SHOPPING_EXISTS':
      return es.errors.activeShoppingExists;
    case 'LAST_ITEM_IN_SHOPPING':
      return es.errors.lastItemInShopping;
    case 'NO_CHECKED':
      return es.errors.noChecked;
    case 'DB_BROKEN':
    case 'DB_TIMEOUT':
      return es.errors.dbBroken;
    case 'DB_BUSY':
      return es.errors.dbBusy;
    default:
      return fallback;
  }
}
