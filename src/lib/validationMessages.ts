import type { ValidationFailure } from '@/domain/validation';
import { es } from '@/strings/es';

export function listNameErrorMessage(reason: ValidationFailure): string {
  return reason === 'required'
    ? es.validation.listNameRequired
    : es.validation.listNameTooLong;
}

export function itemNameErrorMessage(reason: ValidationFailure): string {
  return reason === 'required'
    ? es.validation.itemNameRequired
    : es.validation.itemNameTooLong;
}

export function supermarketNameErrorMessage(reason: ValidationFailure): string {
  return reason === 'required'
    ? es.validation.supermarketRequired
    : es.validation.supermarketTooLong;
}
