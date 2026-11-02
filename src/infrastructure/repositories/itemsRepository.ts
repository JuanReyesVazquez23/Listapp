import type { ItemDetail, ShoppingItem } from '@/domain/item';
import { isShoppingMode, type ListStatus, type ShoppingMode } from '@/domain/list';
import {
  ITEM_COLUMNS,
  ITEM_COLUMNS_ALIASED,
  mapItemRow,
  type ItemRow,
  type ItemWithListRow,
} from '@/infrastructure/repositories/rows';
import type { SqlReader, Tx } from '@/infrastructure/sqlDatabase';

export interface InsertItemInput {
  id: string;
  listId: string;
  name: string;
  nowUtc: number;
  isChecked?: boolean;
  checkedAtUtc?: number | null;
  preferredSortOrder?: number;
  detail?: ItemDetail | null;
}

export interface ItemWithListStatus {
  item: ShoppingItem;
  listStatus: ListStatus;
  shoppingMode: ShoppingMode | null;
}

export interface PricedTotals {
  checked: number;
  priced: number;
  unpriced: number;
  totalCents: number;
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
    `SELECT ${ITEM_COLUMNS_ALIASED},
            l.status AS list_status,
            l.shopping_mode AS shopping_mode
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
    shoppingMode:
      row.shopping_mode !== null && isShoppingMode(row.shopping_mode)
        ? row.shopping_mode
        : null,
  };
}

export async function countItems(reader: SqlReader, listId: string): Promise<number> {
  const row = await reader.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM items WHERE list_id = ?',
    [listId],
  );
  return row?.count ?? 0;
}

/** Devuelve total y marcados en una sola consulta para actualizar el progreso. */
export async function countItemProgress(
  reader: SqlReader,
  listId: string,
): Promise<{ total: number; checked: number }> {
  const row = await reader.get<{ total: number; checked: number }>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_checked), 0) AS checked
       FROM items
      WHERE list_id = ?`,
    [listId],
  );
  return {
    total: row?.total ?? 0,
    checked: row?.checked ?? 0,
  };
}

/**
 * Escribe el estado de check de forma absoluta.
 *
 * No se usa `is_checked = NOT is_checked` para que dos toques rápidos no se
 * cancelen entre sí: el cliente envía el estado que quiere ver. Al desmarcar
 * se borra el detalle en la misma sentencia: una línea sin comprar no puede
 * conservar marca ni precio, y el modelo lo respalda con un CHECK.
 */
export async function setItemCheckedRow(
  tx: Tx,
  id: string,
  checked: boolean,
  nowUtc: number,
): Promise<number> {
  const result = checked
    ? await tx.run(
        `UPDATE items
            SET is_checked = 1, checked_at_utc = ?, updated_at_utc = ?
          WHERE id = ?`,
        [nowUtc, nowUtc, id],
      )
    : await tx.run(
        `UPDATE items
            SET is_checked = 0,
                checked_at_utc = NULL,
                brand = NULL,
                quantity_milli = NULL,
                unit_code = NULL,
                unit_price_cents = NULL,
                line_subtotal_cents = NULL,
                catalog_product_id = NULL,
                updated_at_utc = ?
          WHERE id = ?`,
        [nowUtc, id],
      );
  return result.changes;
}

/** Desmarca todos los artículos de una lista al cancelar la compra. */
export async function clearItemChecks(
  tx: Tx,
  listId: string,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    `UPDATE items
        SET is_checked = 0,
            checked_at_utc = NULL,
            brand = NULL,
            quantity_milli = NULL,
            unit_code = NULL,
            unit_price_cents = NULL,
            line_subtotal_cents = NULL,
            catalog_product_id = NULL,
            updated_at_utc = ?
      WHERE list_id = ? AND is_checked = 1`,
    [nowUtc, listId],
  );
  return result.changes;
}

export async function insertItem(tx: Tx, input: InsertItemInput): Promise<ShoppingItem> {
  const checked = input.isChecked === true;
  const checkedAtUtc = checked ? (input.checkedAtUtc ?? input.nowUtc) : null;
  const detail = checked ? (input.detail ?? null) : null;
  const sortOrder = await resolveSortOrder(tx, input.listId, input.preferredSortOrder);

  await tx.run(
    `INSERT INTO items (
      id, list_id, name, is_checked, checked_at_utc, sort_order,
      created_at_utc, updated_at_utc,
      brand, quantity_milli, unit_code, unit_price_cents,
      line_subtotal_cents, catalog_product_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.listId,
      input.name,
      checked ? 1 : 0,
      checkedAtUtc,
      sortOrder,
      input.nowUtc,
      input.nowUtc,
      detail?.brand ?? null,
      detail?.quantityMilli ?? null,
      detail?.unit ?? null,
      detail?.unitPriceCents ?? null,
      detail?.lineSubtotalCents ?? null,
      detail?.catalogProductId ?? null,
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
    detail,
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

/**
 * Marca un artículo con detalle dentro de una compra de catálogo.
 *
 * La condición de modo y estado viaja en el `WHERE`, no solo en la guarda del
 * caso de uso: la cola serial impide que otra escritura se cuele entre la
 * lectura y este `UPDATE`, pero la propia sentencia sigue siendo la última
 * defensa. Un artículo ya marcado no se vuelve a marcar con otro detalle.
 */
export async function checkItemRow(
  tx: Tx,
  id: string,
  detail: ItemDetail | null,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    `UPDATE items
        SET is_checked = 1,
            checked_at_utc = ?,
            updated_at_utc = ?,
            brand = ?,
            quantity_milli = ?,
            unit_code = ?,
            unit_price_cents = ?,
            line_subtotal_cents = ?,
            catalog_product_id = ?
      WHERE id = ?
        AND is_checked = 0
        AND EXISTS (
          SELECT 1 FROM lists l
           WHERE l.id = items.list_id
             AND l.status = 'shopping'
             AND l.shopping_mode = 'catalog'
        )`,
    [
      nowUtc,
      nowUtc,
      detail?.brand ?? null,
      detail?.quantityMilli ?? null,
      detail?.unit ?? null,
      detail?.unitPriceCents ?? null,
      detail?.lineSubtotalCents ?? null,
      detail?.catalogProductId ?? null,
      id,
    ],
  );
  return result.changes;
}

/**
 * Cambia el detalle de una línea ya marcada. `detail = null` lo borra sin
 * desmarcar: el artículo sigue comprado, pero el total pasa a ser parcial.
 */
export async function updateItemDetailRow(
  tx: Tx,
  id: string,
  detail: ItemDetail | null,
  nowUtc: number,
): Promise<number> {
  const result = await tx.run(
    `UPDATE items
        SET brand = ?,
            quantity_milli = ?,
            unit_code = ?,
            unit_price_cents = ?,
            line_subtotal_cents = ?,
            catalog_product_id = ?,
            updated_at_utc = ?
      WHERE id = ?
        AND is_checked = 1
        AND EXISTS (
          SELECT 1 FROM lists l
           WHERE l.id = items.list_id
             AND l.status = 'shopping'
             AND l.shopping_mode = 'catalog'
        )`,
    [
      detail?.brand ?? null,
      detail?.quantityMilli ?? null,
      detail?.unit ?? null,
      detail?.unitPriceCents ?? null,
      detail?.lineSubtotalCents ?? null,
      detail?.catalogProductId ?? null,
      nowUtc,
      id,
    ],
  );
  return result.changes;
}

/**
 * Cuenta las líneas marcadas y suma solo las que tienen precio.
 *
 * `totalCents` es 0 cuando hay líneas con precio que suman cero; el caso de uso
 * lo convierte en `null` únicamente si no hay ninguna línea con detalle.
 */
export async function findPricedTotals(tx: Tx, listId: string): Promise<PricedTotals> {
  const row = await tx.get<PricedTotals>(
    `SELECT
       COALESCE(SUM(CASE WHEN is_checked = 1 THEN 1 ELSE 0 END), 0) AS checked,
       COALESCE(SUM(CASE WHEN is_checked = 1 AND quantity_milli IS NOT NULL
                         THEN 1 ELSE 0 END), 0) AS priced,
       COALESCE(SUM(CASE WHEN is_checked = 1 AND quantity_milli IS NULL
                         THEN 1 ELSE 0 END), 0) AS unpriced,
       COALESCE(SUM(CASE WHEN is_checked = 1 AND quantity_milli IS NOT NULL
                         THEN line_subtotal_cents ELSE 0 END), 0) AS totalCents
     FROM items
     WHERE list_id = ?`,
    [listId],
  );
  return {
    checked: row?.checked ?? 0,
    priced: row?.priced ?? 0,
    unpriced: row?.unpriced ?? 0,
    totalCents: row?.totalCents ?? 0,
  };
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
