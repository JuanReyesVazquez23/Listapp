import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import type { SqlDatabase, SqlParams, SqlRunResult } from '@/data/sqlDatabase';
import { AppError } from '@/lib/errors';

/**
 * Adaptador de producción sobre `expo-sqlite`.
 *
 * No inicia transacciones ni conoce reglas de negocio: solo traduce el puerto
 * `SqlDatabase` a la API asíncrona de Expo. La cola serial y el ciclo de vida
 * viven en `DatabaseManager`.
 */
export class ExpoSqliteAdapter implements SqlDatabase {
  private constructor(private readonly db: SQLiteDatabase) {}

  static async open(databaseName: string): Promise<ExpoSqliteAdapter> {
    try {
      const db = await openDatabaseAsync(databaseName);
      return new ExpoSqliteAdapter(db);
    } catch (error) {
      throw new AppError('DB_CONFIG', 'No se pudo abrir la base de datos.', error);
    }
  }

  async exec(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async run(sql: string, params?: SqlParams): Promise<SqlRunResult> {
    const result = await this.db.runAsync(sql, toBindParams(params));
    return {
      changes: result.changes,
      lastInsertRowId: result.lastInsertRowId,
    };
  }

  async get<T>(sql: string, params?: SqlParams): Promise<T | null> {
    return this.db.getFirstAsync<T>(sql, toBindParams(params));
  }

  async all<T>(sql: string, params?: SqlParams): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, toBindParams(params));
  }

  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}

function toBindParams(params: SqlParams | undefined): SQLiteBindValue[] {
  return params ? [...params] : [];
}
