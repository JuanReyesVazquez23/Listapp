import type { ShoppingItem } from '@/domain/item';

export interface PurchaseItemSplit {
  purchased: ShoppingItem[];
  notPurchased: ShoppingItem[];
}

export interface PurchaseTotal {
  totalCents: number | null;
  pricedCount: number;
  unpricedCount: number;
  isPartial: boolean;
}

/**
 * Separa los artículos de una compra cerrada en comprados y sin comprar.
 *
 * Conserva el orden de entrada (`sort_order`) dentro de cada grupo: el
 * historial muestra lo que se compró y lo que quedó pendiente sin reordenar
 * nada por el estado.
 */
export function splitPurchaseItems(items: readonly ShoppingItem[]): PurchaseItemSplit {
  return {
    purchased: items.filter((item) => item.isChecked),
    notPurchased: items.filter((item) => !item.isChecked),
  };
}

/**
 * Calcula el total de la compra a partir de las líneas marcadas.
 *
 * `totalCents` es `null` cuando ninguna línea marcada tiene precio: una compra
 * sin precios no muestra un total falso de cero. Si hay al menos una línea con
 * detalle, el total es su suma y puede ser cero. El total es parcial cuando
 * conviven líneas con precio y líneas marcadas sin precio.
 */
export function computePurchaseTotal(items: readonly ShoppingItem[]): PurchaseTotal {
  let totalCents = 0;
  let pricedCount = 0;
  let unpricedCount = 0;

  for (const item of items) {
    if (!item.isChecked) {
      continue;
    }
    if (item.detail) {
      totalCents += item.detail.lineSubtotalCents;
      pricedCount += 1;
    } else {
      unpricedCount += 1;
    }
  }

  return {
    totalCents: pricedCount > 0 ? totalCents : null,
    pricedCount,
    unpricedCount,
    isPartial: pricedCount > 0 && unpricedCount > 0,
  };
}
