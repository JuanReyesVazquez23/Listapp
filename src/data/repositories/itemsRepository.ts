import type { ShoppingItem } from '@/domain/item';
import type { ListStatus } from '@/domain/list';
import {
  ITEM_COLUMNS,
  mapItemRow,
  type ItemRow,
  type ItemWithListRow,
} from '@/data/repositories/rows';
import type { SqlReader, Tx } from '@/data/sqlDatabase';

export interface InsertItemInput {
  id: string;
  listId: string;
  name: string;
  nowUtc: number;
  isChecked?: boolean;
  checkedAtUtc?: number | null;
  preferredSortOrder?: number;
}

export interface ItemWithListStatus {
  item: ShoppingItem;
  listStatus: ListStatus;
}

export async function findItemsByList(
  reader: SqlReader,
  listId: string,
): Promise<ShoppingItem[]> {
  const rows = await reader.all<ItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM items WHERE list_id = ? ORDER BY sort_order ASC`,
    [listId],
  );
  return rows.map(mapItemRow);
}

export async function findItemById(
  reader: SqlReader,
  id: string,
): Promise<ShoppingItem | null> {
  const row = await reader.get<ItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM items WHERE id = ?`,
    [id],
  );
  return row ? mapItemRow(row) : null;
}

export async function findItemWithListStatus(
  reader: SqlReader,
  id: string,
): Promise<ItemWithListStatus | null> {
  const row = await reader.get<ItemWithListRow>(
    `SELECT i.id, i.list_id, i.name, i.is_checked, i.checked_at_utc,
            i.sort_order, i.created_at_utc, i.updated_at_utc,
            l.status AS list_status
       FROM items i
       JOIN lists l ON l.id = i.list_id
      WHERE i.id = ?`,
    [id],
  );
  if (!row) {
    return null;
  }
  return {
    item: mapItemRow(row),
    listStatus: row.list_status as ListStatus,
  };
}

export async function countItems(reader: SqlReader, listId: string): Promise<number> {
  const row = await reader.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM items WHERE list_id = ?',
    [listId],
  );
  return row?.count ?? 0;
}

export async function insertItem(tx: Tx, input: InsertItemInput): Promise<ShoppingItem> {
  const checked = input.isChecked === true;
  const checkedAtUtc = checked ? (input.checkedAtUtc ?? input.nowUtc) : null;
  const sortOrder = await resolveSortOrder(tx, input.listId, input.preferredSortOrder);

  await tx.run(
    `INSERT INTO items (
      id, list_id, name, is_checked, checked_at_utc, sort_order,
      created_at_utc, updated_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.listId,
      input.name,
      checked ? 1 : 0,
      checkedAtUtc,
      sortOrder,
      input.nowUtc,
      input.nowUtc,
    ],
  );

  return {
    id: input.id,
    listId: input.listId,
    name: input.name,
    isChecked: checked,
    checkedAtUtc,
    sortOrder,
    createdAtUtc: input.nowUtc,
    updatedAtUtc: input.nowUtc,
  };
}

export async function renameItemRow(
  tx: Tx,
  id: string,
  name: string,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    'UPDATE items SET name = ?, updated_at_utc = ? WHERE id = ?',
    [name, nowUtc, id],
  );
  return result.changes;
}

export async function deleteItemRow(tx: Tx, id: string): Promise<number> {
  const result = await tx.run('DELETE FROM items WHERE id = ?', [id]);
  return result.changes;
}

async function resolveSortOrder(
  tx: Tx,
  listId: string,
  preferred?: number,
): Promise<number> {
  if (preferred !== undefined && preferred > 0) {
    const taken = await tx.get<{ taken: number }>(
      'SELECT 1 AS taken FROM items WHERE list_id = ? AND sort_order = ?',
      [listId, preferred],
    );
    if (!taken) {
      return preferred;
    }
  }

  const next = await tx.get<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM items WHERE list_id = ?',
    [listId],
  );
  return next?.next ?? 1;
}
