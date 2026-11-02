import type { ItemDetail } from '@/domain/item';
import { formatCents } from '@/domain/money';
import { formatQuantityNumber } from '@/domain/quantity';
import { es } from '@/strings/es';

/**
 * Línea corta que resume el detalle de una compra con catálogo:
 * `Marca · 2 Libra · RD$350.00`. Sin detalle no hay texto que mostrar.
 */
export function itemDetailText(detail: ItemDetail | null): string | null {
  if (!detail) {
    return null;
  }
  const brand = detail.brand ? `${detail.brand} · ` : '';
  return `${brand}${formatQuantityNumber(detail.quantityMilli)} ${
    es.units[detail.unit]
  } · ${formatCents(detail.lineSubtotalCents)}`;
}
