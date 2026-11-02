import type { ItemDetail, ShoppingItem } from '@/domain/item';
import type { ListStatus, ListSummary, ShoppingList } from '@/domain/list';
import { isShoppingMode } from '@/domain/list';
import { isQuantityUnit } from '@/domain/quantity';

export interface ListRow {
  id: string;
  name: string;
  status: string;
  created_at_utc: number;
  updated_at_utc: number;
  completed_at_utc: number | null;
  completed_local_date: string | null;
  completed_local_time: string | null;
  supermarket_name: string | null;
  shopping_mode: string | null;
  total_cents: number | null;
}

export interface ListSummaryRow extends ListRow {
  item_count: number;
  checked_count: number;
  unpriced_checked_count: number;
}

export interface ItemRow {
  id: string;
  list_id: string;
  name: string;
  is_checked: number;
  checked_at_utc: number | null;
  sort_order: number;
  created_at_utc: number;
  updated_at_utc: number;
  brand: string | null;
  quantity_milli: number | null;
  unit_code: string | null;
  unit_price_cents: number | null;
  line_subtotal_cents: number | null;
  catalog_product_id: string | null;
}

export interface ItemWithListRow extends ItemRow {
  list_status: string;
  shopping_mode: string | null;
}

export const LIST_COLUMNS = `id, name, status, created_at_utc, updated_at_utc,
  completed_at_utc, completed_local_date, completed_local_time,
  supermarket_name, shopping_mode, total_cents`;

export const ITEM_COLUMNS = `id, list_id, name, is_checked, checked_at_utc,
  sort_order, created_at_utc, updated_at_utc,
  brand, quantity_milli, unit_code, unit_price_cents,
  line_subtotal_cents, catalog_product_id`;

/**
 * Las mismas columnas de `items` con el alias `i.` para las consultas con JOIN.
 *
 * Se derivan de `ITEM_COLUMNS` para que añadir una columna no obligue a
 * recordar dos listas que pueden desincronizarse.
 */
export const ITEM_COLUMNS_ALIASED = ITEM_COLUMNS.split(',')
  .map((column) => `i.${column.trim()}`)
  .join(', ');

export function mapListRow(row: ListRow): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ListStatus,
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc,
    completedAtUtc: row.completed_at_utc,
    completedLocalDate: row.completed_local_date,
    completedLocalTime: row.completed_local_time,
    supermarketName: row.supermarket_name,
    // Un valor fuera del dominio solo puede venir de una base manipulada; se
    // trata como ausencia de modo en vez de propagar un literal inventado.
    shoppingMode:
      row.shopping_mode !== null && isShoppingMode(row.shopping_mode)
        ? row.shopping_mode
        : null,
    totalCents: row.total_cents,
  };
}

export function mapListSummaryRow(row: ListSummaryRow): ListSummary {
  return {
    ...mapListRow(row),
    itemCount: row.item_count,
    checkedCount: row.checked_count,
    unpricedCheckedCount: row.unpriced_checked_count,
  };
}

export function mapItemRow(row: ItemRow): ShoppingItem {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    isChecked: row.is_checked === 1,
    checkedAtUtc: row.checked_at_utc,
    sortOrder: row.sort_order,
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc,
    detail: mapItemDetail(row),
  };
}

/**
 * Reconstruye el detalle solo cuando la fila tiene una línea completa.
 *
 * El subtotal se lee tal cual se guardó: recalcularlo aquí podría ocultar una
 * diferencia entre lo que vio el usuario al comprar y lo que muestra el
 * historial.
 */
function mapItemDetail(row: ItemRow): ItemDetail | null {
  if (
    row.quantity_milli === null ||
    row.unit_code === null ||
    !isQuantityUnit(row.unit_code) ||
    row.unit_price_cents === null ||
    row.line_subtotal_cents === null
  ) {
    return null;
  }

  return {
    brand: row.brand,
    quantityMilli: row.quantity_milli,
    unit: row.unit_code,
    unitPriceCents: row.unit_price_cents,
    lineSubtotalCents: row.line_subtotal_cents,
    catalogProductId: row.catalog_product_id,
  };
}
