import type { ShoppingItem } from '@/domain/item';

export interface PurchaseItemSplit {
  purchased: ShoppingItem[];
  notPurchased: ShoppingItem[];
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
