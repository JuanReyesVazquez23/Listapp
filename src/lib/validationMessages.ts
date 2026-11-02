import type { ItemDetailFailure } from '@/domain/item';
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

/**
 * Traduce el fallo del detalle de la línea al mensaje que se pinta bajo su
 * campo. La marca y la unidad tienen un único fallo posible; cantidad y precio
 * comparten el repertorio de `parseAmountToCents`.
 */
export function itemDetailErrorMessage(failure: ItemDetailFailure): string {
  switch (failure.field) {
    case 'brand':
      return es.validation.itemBrandTooLong;
    case 'unit':
      return es.validation.itemUnitRequired;
    case 'quantity':
      switch (failure.reason) {
        case 'required':
          return es.validation.itemQuantityRequired;
        case 'too_large':
          return es.validation.itemQuantityTooLarge;
        default:
          return es.validation.itemQuantityInvalid;
      }
    case 'price':
      switch (failure.reason) {
        case 'required':
          return es.validation.itemPriceRequired;
        case 'too_large':
          return es.validation.itemPriceTooLarge;
        default:
          return es.validation.itemPriceInvalid;
      }
    case 'catalogProductId':
      return es.errors.generic;
  }
}
