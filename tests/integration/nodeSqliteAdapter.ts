import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlParams, SqlRunResult } from '@/data/sqlDatabase';

/**
 * Adaptador de test sobre `node:sqlite`.
 * Usa un archivo temporal real para ejercitar WAL, FK y transacciones.
 */
export class NodeSqliteAdapter implements SqlDatabase {
  private constructor(private readonly db: DatabaseSync) {}

  static open(path: string): NodeSqliteAdapter {
    return new NodeSqliteAdapter(new DatabaseSync(path));
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: SqlParams = []): Promise<SqlRunResult> {
    const statement = this.db.prepare(sql);
    const result = statement.run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowId: result.lastInsertRowid,
    };
  }

  async get<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    const row = this.db.prepare(sql).get(...params);
    return row ? (toPlainRow(row) as T) : null;
  }

  async all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    const rows = this.db.prepare(sql).all(...params);
    return rows.map((row) => toPlainRow(row) as T);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

function toPlainRow(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row };
}
