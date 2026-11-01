import {
  lineSubtotalCents,
  parseAmountToCents,
  type AmountParseFailure,
} from '@/domain/money';
import {
  isQuantityUnit,
  parseQuantityToMilli,
  type QuantityUnit,
} from '@/domain/quantity';
import { countCharacters } from '@/domain/validation';

export const ITEM_DETAIL_LIMITS = { brand: 60, catalogProductId: 40 } as const;

export interface ItemDetail {
  brand: string | null;
  quantityMilli: number;
  unit: QuantityUnit;
  unitPriceCents: number;
  lineSubtotalCents: number;
  catalogProductId: string | null;
}

/** Detalle ya validado; el subtotal todavía no se ha calculado. */
export interface ItemDetailInput {
  brand: string | null;
  quantityMilli: number;
  unit: QuantityUnit;
  unitPriceCents: number;
  catalogProductId: string | null;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  isChecked: boolean;
  checkedAtUtc: number | null;
  sortOrder: number;
  createdAtUtc: number;
  updatedAtUtc: number;
  detail: ItemDetail | null;
}

/** Valores en crudo del formulario, todavía sin validar. */
export interface ItemDetailDraft {
  brand: string;
  quantity: string;
  unit: QuantityUnit;
  unitPrice: string;
}

export type ItemDetailFailure =
  | { field: 'brand'; reason: 'too_long' }
  | { field: 'quantity'; reason: AmountParseFailure }
  | { field: 'unit'; reason: 'required' }
  | { field: 'price'; reason: AmountParseFailure }
  | { field: 'catalogProductId'; reason: 'too_long' };

export type ItemDetailValidation =
  | { ok: true; value: ItemDetailInput }
  | { ok: false; failures: ItemDetailFailure[] };

/**
 * Valida el formulario de detalle y devuelve todos los fallos juntos.
 *
 * Se recogen todos los campos inválidos para que la UI pueda marcar cada uno
 * inline, en vez de obligar al usuario a corregirlos de uno en uno. La marca
 * es opcional y se guarda recortada; la cantidad y el precio tienen que ser
 * positivos y respetar sus límites.
 */
export function validateItemDetail(
  draft: ItemDetailDraft,
  catalogProductId: string | null = null,
): ItemDetailValidation {
  const failures: ItemDetailFailure[] = [];

  const brand = draft.brand.trim();
  if (countCharacters(brand) > ITEM_DETAIL_LIMITS.brand) {
    failures.push({ field: 'brand', reason: 'too_long' });
  }

  const quantity = parseQuantityToMilli(draft.quantity);
  if (!quantity.ok) {
    failures.push({ field: 'quantity', reason: quantity.reason });
  }

  // La UI solo ofrece unidades conocidas, pero el validador es una frontera:
  // un borrador restaurado o un dato externo no puede colar otra unidad.
  if (!isQuantityUnit(draft.unit)) {
    failures.push({ field: 'unit', reason: 'required' });
  }

  const price = parseAmountToCents(draft.unitPrice);
  if (!price.ok) {
    failures.push({ field: 'price', reason: price.reason });
  }

  const productId = (catalogProductId ?? '').trim();
  if (countCharacters(productId) > ITEM_DETAIL_LIMITS.catalogProductId) {
    failures.push({ field: 'catalogProductId', reason: 'too_long' });
  }

  if (!quantity.ok || !price.ok || failures.length > 0) {
    return { ok: false, failures };
  }

  return {
    ok: true,
    value: {
      brand: brand.length > 0 ? brand : null,
      quantityMilli: quantity.value,
      unit: draft.unit,
      unitPriceCents: price.value,
      catalogProductId: productId.length > 0 ? productId : null,
    },
  };
}

/** Completa el detalle validado con el subtotal de la línea. */
export function itemDetailFromInput(input: ItemDetailInput): ItemDetail {
  return {
    ...input,
    lineSubtotalCents: lineSubtotalCents(input.quantityMilli, input.unitPriceCents),
  };
}
