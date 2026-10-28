import type { ListSummary, ShoppingList } from '@/domain/list';
import {
  LIST_COLUMNS,
  mapListRow,
  mapListSummaryRow,
  type ListRow,
  type ListSummaryRow,
} from '@/infrastructure/repositories/rows';
import type { SqlReader, Tx } from '@/infrastructure/sqlDatabase';

export interface InsertListInput {
  id: string;
  name: string;
  nowUtc: number;
}

export async function insertList(tx: Tx, input: InsertListInput): Promise<ShoppingList> {
  await tx.run(
    `INSERT INTO lists (
      id, name, status, created_at_utc, updated_at_utc,
      completed_at_utc, completed_local_date, completed_local_time, supermarket_name
    ) VALUES (?, ?, 'draft', ?, ?, NULL, NULL, NULL, NULL)`,
    [input.id, input.name, input.nowUtc, input.nowUtc],
  );

  return {
    id: input.id,
    name: input.name,
    status: 'draft',
    createdAtUtc: input.nowUtc,
    updatedAtUtc: input.nowUtc,
    completedAtUtc: null,
    completedLocalDate: null,
    completedLocalTime: null,
    supermarketName: null,
  };
}

export async function findListById(
  reader: SqlReader,
  id: string,
): Promise<ShoppingList | null> {
  const row = await reader.get<ListRow>(
    `SELECT ${LIST_COLUMNS} FROM lists WHERE id = ?`,
    [id],
  );
  return row ? mapListRow(row) : null;
}

export async function findListSummaries(reader: SqlReader): Promise<ListSummary[]> {
  const rows = await reader.all<ListSummaryRow>(
    `SELECT l.id, l.name, l.status, l.created_at_utc, l.updated_at_utc,
            l.completed_at_utc, l.completed_local_date, l.completed_local_time,
            l.supermarket_name,
            (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id) AS item_count,
            (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id AND i.is_checked = 1)
              AS checked_count
       FROM lists l
      WHERE l.status IN ('draft', 'shopping')
      ORDER BY CASE l.status WHEN 'shopping' THEN 0 ELSE 1 END,
               l.updated_at_utc DESC`,
  );
  return rows.map(mapListSummaryRow);
}

/** Devuelve el id de la única compra activa, o `null` si no hay ninguna. */
export async function findActiveShoppingId(reader: SqlReader): Promise<string | null> {
  const row = await reader.get<{ id: string }>(
    "SELECT id FROM lists WHERE status = 'shopping' LIMIT 1",
  );
  return row?.id ?? null;
}

/**
 * Pasa una lista de `draft` a `shopping` solo si sigue en borrador.
 * El `WHERE` evita que dos pantallas inicien la misma compra a la vez.
 */
export async function startShoppingRow(
  tx: Tx,
  id: string,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    `UPDATE lists
        SET status = 'shopping', updated_at_utc = ?
      WHERE id = ? AND status = 'draft'`,
    [nowUtc, id],
  );
  return result.changes;
}

/**
 * Devuelve una compra activa a `draft` solo si sigue en `shopping`.
 * Los checks se limpian en la misma transacción desde el caso de uso.
 */
export async function cancelShoppingRow(
  tx: Tx,
  id: string,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    `UPDATE lists
        SET status = 'draft', updated_at_utc = ?
      WHERE id = ? AND status = 'shopping'`,
    [nowUtc, id],
  );
  return result.changes;
}

export async function renameListRow(
  tx: Tx,
  id: string,
  name: string,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    `UPDATE lists
        SET name = ?, updated_at_utc = ?
      WHERE id = ? AND status <> 'completed'`,
    [name, nowUtc, id],
  );
  return result.changes;
}

export async function deleteListRow(tx: Tx, id: string): Promise<number> {
  const result = await tx.run(
    `DELETE FROM lists WHERE id = ? AND status <> 'completed'`,
    [id],
  );
  return result.changes;
}

export async function touchList(tx: Tx, id: string, nowUtc: number): Promise<void> {
  await tx.run('UPDATE lists SET updated_at_utc = ? WHERE id = ?', [nowUtc, id]);
}
