import type { GuardFailure } from '@/domain/lifecycle';
import type { ValidationFailure } from '@/domain/validation';
import { AppError } from '@/lib/errors';
import { es } from '@/strings/es';

export function listNameError(reason: ValidationFailure): AppError {
  return new AppError(
    'VALIDATION',
    reason === 'required' ? es.validation.listNameRequired : es.validation.listNameTooLong,
    { reason, field: 'listName' },
  );
}

export function itemNameError(reason: ValidationFailure): AppError {
  return new AppError(
    'VALIDATION',
    reason === 'required' ? es.validation.itemNameRequired : es.validation.itemNameTooLong,
    { reason, field: 'itemName' },
  );
}

export function guardError(failure: GuardFailure): AppError {
  return new AppError(failure, guardMessage(failure));
}

function guardMessage(failure: GuardFailure): string {
  switch (failure) {
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
    case 'EMPTY_LIST':
      return es.errors.emptyList;
    case 'NO_CHECKED':
      return es.errors.noChecked;
  }
}
