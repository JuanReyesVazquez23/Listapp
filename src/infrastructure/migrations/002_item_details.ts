import type { Migration } from '@/infrastructure/migrations/001_initial';
import type { Tx } from '@/infrastructure/sqlDatabase';

interface RowCounts {
  lists: number;
  items: number;
}

/**
 * El DDL final de `lists` se define una sola vez y se instancia con el nombre
 * de tabla que corresponda.
 *
 * La migración necesita crear la tabla como `lists_v2` y el esquema final se
 * llama `lists`; generar ambas desde la misma función evita que las dos
 * definiciones se separen con el tiempo. Los nombres solo pueden ser estos
 * literales: nunca llegan datos externos a la plantilla.
 */
function listsTableSql(tableName: 'lists' | 'lists_v2'): string {
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
      AND supermarket_name IS NOT NULL
      AND length(trim(supermarket_name, char(9) || char(10) || char(13) || ' '))
          BETWEEN 1 AND 80
    )
    OR (
      status <> 'completed'
      AND completed_at_utc IS NULL
      AND completed_local_date IS NULL
      AND completed_local_time IS NULL
      AND supermarket_name IS NULL
    )
  ),

  -- El modo es obligatorio en compra y en comprada; en borrador no existe.
  -- El total solo existe en comprada y solo en catálogo.
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

/**
 * El DDL de `items` se instancia con el nombre de la tabla y el de su padre.
 *
 * En la migración el hijo se llama `items_v2` y apunta a `lists_v2`; tras el
 * renombrado del padre, SQLite reescribe la referencia a `lists`.
 */
export function itemsTableSql(
  tableName: 'items' | 'items_v2' | 'items_v3',
  parentTable: 'lists' | 'lists_v2' | 'lists_v3',
): string {
  return `
CREATE TABLE ${tableName} (
  id TEXT PRIMARY KEY NOT NULL,
  list_id TEXT NOT NULL REFERENCES ${parentTable}(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (
    length(trim(name, char(9) || char(10) || char(13) || ' ')) BETWEEN 1 AND 100
  ),
  is_checked INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(is_checked) = 'integer' AND is_checked IN (0, 1)),
  checked_at_utc INTEGER,
  sort_order INTEGER NOT NULL
    CHECK (typeof(sort_order) = 'integer' AND sort_order > 0),
  created_at_utc INTEGER NOT NULL,
  updated_at_utc INTEGER NOT NULL,

  brand TEXT CHECK (
    brand IS NULL
    OR (
      typeof(brand) = 'text'
      AND length(trim(brand, char(9) || char(10) || char(13) || ' ')) BETWEEN 1 AND 60
    )
  ),
  quantity_milli INTEGER CHECK (
    quantity_milli IS NULL
    OR (typeof(quantity_milli) = 'integer' AND quantity_milli BETWEEN 1 AND 999999)
  ),
  unit_code TEXT CHECK (
    unit_code IS NULL
    OR (typeof(unit_code) = 'text'
        AND unit_code IN ('unit', 'pound', 'kilogram', 'liter'))
  ),
  unit_price_cents INTEGER CHECK (
    unit_price_cents IS NULL
    OR (typeof(unit_price_cents) = 'integer'
        AND unit_price_cents BETWEEN 1 AND 9999999)
  ),
  line_subtotal_cents INTEGER CHECK (
    line_subtotal_cents IS NULL
    OR (typeof(line_subtotal_cents) = 'integer'
        AND line_subtotal_cents BETWEEN 0 AND 9999989000)
  ),
  catalog_product_id TEXT CHECK (
    catalog_product_id IS NULL
    OR (typeof(catalog_product_id) = 'text'
        AND length(catalog_product_id) BETWEEN 1 AND 40)
  ),

  UNIQUE (list_id, sort_order),

  CHECK (
    (is_checked = 1 AND checked_at_utc IS NOT NULL)
    OR (is_checked = 0 AND checked_at_utc IS NULL)
  ),

  -- Todo o nada: no existe una línea con solo marca, solo precio o solo cantidad.
  CHECK (
    (quantity_milli IS NULL
      AND unit_code IS NULL
      AND unit_price_cents IS NULL
      AND line_subtotal_cents IS NULL
      AND brand IS NULL
      AND catalog_product_id IS NULL)
    OR
    (quantity_milli IS NOT NULL
      AND unit_code IS NOT NULL
      AND unit_price_cents IS NOT NULL
      AND line_subtotal_cents IS NOT NULL)
  ),

  -- Un único redondeo, el mismo de lineSubtotalCents: empate hacia arriba.
  CHECK (
    quantity_milli IS NULL
    OR line_subtotal_cents = (quantity_milli * unit_price_cents + 500) / 1000
  ),

  -- Lo que no se compró no tiene precio ni detalle.
  CHECK (is_checked = 1 OR quantity_milli IS NULL)
);`;
}

export const INDEXES_SQL = `
CREATE INDEX idx_lists_active
  ON lists(status, updated_at_utc DESC)
  WHERE status IN ('draft', 'shopping');

CREATE INDEX idx_lists_history
  ON lists(completed_at_utc DESC)
  WHERE status = 'completed';

CREATE UNIQUE INDEX ux_lists_single_shopping
  ON lists(status)
  WHERE status = 'shopping';
`;

async function readCounts(tx: Tx, listsTable: string, itemsTable: string): Promise<RowCounts | null> {
  return tx.get<RowCounts>(
    `SELECT (SELECT COUNT(*) FROM ${listsTable}) AS lists,
            (SELECT COUNT(*) FROM ${itemsTable}) AS items`,
  );
}

/**
 * Añade modo de compra y detalle de línea al esquema.
 *
 * El orden es deliberado: se copian los datos a tablas nuevas, se comprueban
 * los conteos y solo entonces se borran las antiguas y se renombran. Como la
 * migración corre dentro de una transacción, un fallo deja intactos los datos
 * y el `user_version` anterior. No se desactivan las claves foráneas: el
 * renombrado del padre antes que el hijo hace que SQLite reescriba la
 * referencia de `items_v2` a `lists`, y la comprobación final lo verifica.
 */
export const migration002: Migration = {
  version: 2,
  name: 'item_details',
  async up(tx: Tx): Promise<void> {
    const before = await readCounts(tx, 'lists', 'items');
    if (!before) {
      throw new Error('No se pudo contar las filas antes de la migración 002.');
    }

    await tx.exec(`
      ${listsTableSql('lists_v2')}

      INSERT INTO lists_v2 (
        id, name, status, created_at_utc, updated_at_utc,
        completed_at_utc, completed_local_date, completed_local_time,
        supermarket_name, shopping_mode, total_cents
      )
      SELECT id, name, status, created_at_utc, updated_at_utc,
             completed_at_utc, completed_local_date, completed_local_time,
             supermarket_name,
             CASE WHEN status IN ('shopping', 'completed') THEN 'normal' ELSE NULL END,
             NULL
        FROM lists;

      ${itemsTableSql('items_v2', 'lists_v2')}

      INSERT INTO items_v2 (
        id, list_id, name, is_checked, checked_at_utc, sort_order,
        created_at_utc, updated_at_utc,
        brand, quantity_milli, unit_code, unit_price_cents,
        line_subtotal_cents, catalog_product_id
      )
      SELECT id, list_id, name, is_checked, checked_at_utc, sort_order,
             created_at_utc, updated_at_utc,
             NULL, NULL, NULL, NULL, NULL, NULL
        FROM items;
    `);

    const copied = await readCounts(tx, 'lists_v2', 'items_v2');
    if (copied?.lists !== before.lists || copied.items !== before.items) {
      throw new Error('La copia de la migración 002 no conserva los conteos.');
    }

    // `items` se borra antes que `lists`: `items_v2` ya no depende del padre
    // antiguo y el borrado no dispara cascadas sobre las filas nuevas.
    await tx.exec(`
      DROP TABLE items;
      DROP TABLE lists;
      ALTER TABLE lists_v2 RENAME TO lists;
      ALTER TABLE items_v2 RENAME TO items;

      ${INDEXES_SQL}
    `);

    const after = await readCounts(tx, 'lists', 'items');
    if (after?.lists !== before.lists || after.items !== before.items) {
      throw new Error('La migración 002 perdió filas tras el renombrado.');
    }

    const violations = await tx.all<{ table: string }>('PRAGMA foreign_key_check');
    if (violations.length > 0) {
      throw new Error('La migración 002 dejó violaciones de clave foránea.');
    }

    const foreignKeys = await tx.all<{ table: string }>('PRAGMA foreign_key_list(items)');
    if (!foreignKeys.some((foreignKey) => foreignKey.table === 'lists')) {
      throw new Error('La FK de items no apunta a lists tras el renombrado.');
    }
  },
};
