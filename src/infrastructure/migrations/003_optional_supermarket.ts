import type { Migration } from '@/infrastructure/migrations/001_initial';
import { INDEXES_SQL, itemsTableSql } from '@/infrastructure/migrations/002_item_details';
import type { Tx } from '@/infrastructure/sqlDatabase';

interface RowCounts {
  lists: number;
  items: number;
}

/**
 * El supermercado deja de ser obligatorio al cerrar una compra.
 *
 * La app ya no pregunta dónde se compró, así que las compras nuevas guardan
 * `NULL`. Se conserva la columna y sus filas antiguas para que el historial
 * pueda seguir mostrando el supermercado de las compras anteriores. El
 * `CHECK` de estado sigue exigiendo que una lista no completada no tenga
 * supermercado, pero una completada puede tenerlo o no.
 */
function listsTableSql(tableName: 'lists' | 'lists_v3'): string {
  return `
CREATE TABLE ${tableName} (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (
    length(trim(name, char(9) || char(10) || char(13) || ' ')) BETWEEN 1 AND 80
  ),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'shopping', 'completed')),
  created_at_utc INTEGER NOT NULL,
  updated_at_utc INTEGER NOT NULL,
  completed_at_utc INTEGER,
  completed_local_date TEXT,
  completed_local_time TEXT,
  supermarket_name TEXT,
  shopping_mode TEXT,
  total_cents INTEGER,

  CHECK (
    (
      status = 'completed'
      AND completed_at_utc IS NOT NULL
      AND completed_local_date IS NOT NULL
      AND completed_local_time IS NOT NULL
      AND (
        supermarket_name IS NULL
        OR (
          typeof(supermarket_name) = 'text'
          AND length(trim(supermarket_name, char(9) || char(10) || char(13) || ' '))
              BETWEEN 1 AND 80
        )
      )
    )
    OR (
      status <> 'completed'
      AND completed_at_utc IS NULL
      AND completed_local_date IS NULL
      AND completed_local_time IS NULL
      AND supermarket_name IS NULL
    )
  ),

  CHECK (
    (status = 'draft'
      AND shopping_mode IS NULL
      AND total_cents IS NULL)
    OR (status = 'shopping'
      AND shopping_mode IN ('normal', 'catalog')
      AND total_cents IS NULL)
    OR (status = 'completed'
      AND shopping_mode = 'normal'
      AND total_cents IS NULL)
    OR (status = 'completed'
      AND shopping_mode = 'catalog'
      AND (
        total_cents IS NULL
        OR (typeof(total_cents) = 'integer' AND total_cents >= 0)
      ))
  )
);`;
}

async function readCounts(
  tx: Tx,
  listsTable: string,
  itemsTable: string,
): Promise<RowCounts | null> {
  return tx.get<RowCounts>(
    `SELECT (SELECT COUNT(*) FROM ${listsTable}) AS lists,
            (SELECT COUNT(*) FROM ${itemsTable}) AS items`,
  );
}

/**
 * Relaja el `CHECK` de `lists` reconstruyendo las dos tablas.
 *
 * SQLite no permite editar un `CHECK` con `ALTER TABLE`, así que se repite el
 * patrón de la migración 002: copiar a tablas nuevas, comprobar los conteos,
 * borrar las antiguas y renombrar. Las claves foráneas se mantienen activas
 * durante todo el proceso y la comprobación final detecta cualquier ruptura.
 */
export const migration003: Migration = {
  version: 3,
  name: 'optional_supermarket',
  async up(tx: Tx): Promise<void> {
    const before = await readCounts(tx, 'lists', 'items');
    if (!before) {
      throw new Error('No se pudo contar las filas antes de la migración 003.');
    }

    await tx.exec(`
      ${listsTableSql('lists_v3')}

      INSERT INTO lists_v3 (
        id, name, status, created_at_utc, updated_at_utc,
        completed_at_utc, completed_local_date, completed_local_time,
        supermarket_name, shopping_mode, total_cents
      )
      SELECT id, name, status, created_at_utc, updated_at_utc,
             completed_at_utc, completed_local_date, completed_local_time,
             supermarket_name, shopping_mode, total_cents
        FROM lists;

      ${itemsTableSql('items_v3', 'lists_v3')}

      INSERT INTO items_v3 (
        id, list_id, name, is_checked, checked_at_utc, sort_order,
        created_at_utc, updated_at_utc,
        brand, quantity_milli, unit_code, unit_price_cents,
        line_subtotal_cents, catalog_product_id
      )
      SELECT id, list_id, name, is_checked, checked_at_utc, sort_order,
             created_at_utc, updated_at_utc,
             brand, quantity_milli, unit_code, unit_price_cents,
             line_subtotal_cents, catalog_product_id
        FROM items;
    `);

    const copied = await readCounts(tx, 'lists_v3', 'items_v3');
    if (copied?.lists !== before.lists || copied.items !== before.items) {
      throw new Error('La copia de la migración 003 no conserva los conteos.');
    }

    await tx.exec(`
      DROP TABLE items;
      DROP TABLE lists;
      ALTER TABLE lists_v3 RENAME TO lists;
      ALTER TABLE items_v3 RENAME TO items;

      ${INDEXES_SQL}
    `);

    const after = await readCounts(tx, 'lists', 'items');
    if (after?.lists !== before.lists || after.items !== before.items) {
      throw new Error('La migración 003 perdió filas tras el renombrado.');
    }

    const violations = await tx.all<{ table: string }>('PRAGMA foreign_key_check');
    if (violations.length > 0) {
      throw new Error('La migración 003 dejó violaciones de clave foránea.');
    }

    const foreignKeys = await tx.all<{ table: string }>('PRAGMA foreign_key_list(items)');
    if (!foreignKeys.some((foreignKey) => foreignKey.table === 'lists')) {
      throw new Error('La FK de items no apunta a lists tras el renombrado.');
    }
  },
};
