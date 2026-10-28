import type { ShoppingItem } from '@/domain/item';
import type { ListStatus, ListSummary, ShoppingList } from '@/domain/list';

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
}

export interface ListSummaryRow extends ListRow {
  item_count: number;
  checked_count: number;
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
}

export interface ItemWithListRow extends ItemRow {
  list_status: string;
}

export const LIST_COLUMNS = `id, name, status, created_at_utc, updated_at_utc,
  completed_at_utc, completed_local_date, completed_local_time, supermarket_name`;

export const ITEM_COLUMNS = `id, list_id, name, is_checked, checked_at_utc,
  sort_order, created_at_utc, updated_at_utc`;

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
  };
}

export function mapListSummaryRow(row: ListSummaryRow): ListSummary {
  return {
    ...mapListRow(row),
    itemCount: row.item_count,
    checkedCount: row.checked_count,
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
  };
}
