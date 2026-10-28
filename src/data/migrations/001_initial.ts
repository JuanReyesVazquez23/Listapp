import type { Tx } from '@/data/sqlDatabase';

export interface Migration {
  version: number;
  name: string;
  up(tx: Tx): Promise<void>;
}

export const INITIAL_SCHEMA_SQL = `
CREATE TABLE lists (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (
    length(trim(name, char(9) || char(10) || char(13) || ' ')) BETWEEN 1 AND 80
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shopping', 'completed')),
  created_at_utc INTEGER NOT NULL,
  updated_at_utc INTEGER NOT NULL,
  completed_at_utc INTEGER,
  completed_local_date TEXT,
  completed_local_time TEXT,
  supermarket_name TEXT,
  CHECK (
    (
      status = 'completed'
      AND completed_at_utc IS NOT NULL
      AND completed_local_date IS NOT NULL
      AND completed_local_time IS NOT NULL
      AND supermarket_name IS NOT NULL
      AND length(trim(supermarket_name, char(9) || char(10) || char(13) || ' ')) BETWEEN 1 AND 80
    )
    OR (
      status <> 'completed'
      AND completed_at_utc IS NULL
      AND completed_local_date IS NULL
      AND completed_local_time IS NULL
      AND supermarket_name IS NULL
    )
  )
);

CREATE TABLE items (
  id TEXT PRIMARY KEY NOT NULL,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (
    length(trim(name, char(9) || char(10) || char(13) || ' ')) BETWEEN 1 AND 100
  ),
  is_checked INTEGER NOT NULL DEFAULT 0 CHECK (is_checked IN (0, 1)),
  checked_at_utc INTEGER,
  sort_order INTEGER NOT NULL CHECK (sort_order > 0),
  created_at_utc INTEGER NOT NULL,
  updated_at_utc INTEGER NOT NULL,
  UNIQUE (list_id, sort_order),
  CHECK (
    (is_checked = 1 AND checked_at_utc IS NOT NULL)
    OR (is_checked = 0 AND checked_at_utc IS NULL)
  )
);

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

export const migration001: Migration = {
  version: 1,
  name: 'initial',
  async up(tx: Tx): Promise<void> {
    await tx.exec(INITIAL_SCHEMA_SQL);
  },
};
