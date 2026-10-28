import type { DatabaseManager } from '@/data/databaseManager';
import { AppError } from '@/lib/errors';

export interface DatabaseDiagnostics {
  sqliteVersion: string;
  schemaVersion: number;
  journalMode: string;
  foreignKeys: boolean;
  writeOk: boolean;
  rollbackOk: boolean;
  errorMessage?: string;
}

interface PragmaRow {
  user_version?: number;
  journal_mode?: string;
  foreign_keys?: number;
}

/**
 * Comprobación de humo del contrato de transacciones en el dispositivo.
 *
 * Crea una tabla temporal, escribe dentro de una transacción, fuerza un
 * rollback y verifica que la fila no persiste. No toca las tablas de la app.
 */
export async function runDatabaseDiagnostics(
  database: DatabaseManager,
): Promise<DatabaseDiagnostics> {
  try {
    const pragmas = await database.read(async (reader) => {
      const version = await reader.get<{ version: string }>('SELECT sqlite_version() AS version');
      const schema = await reader.get<PragmaRow>('PRAGMA user_version');
      const journal = await reader.get<PragmaRow>('PRAGMA journal_mode');
      const foreignKeys = await reader.get<PragmaRow>('PRAGMA foreign_keys');

      return {
        sqliteVersion: version?.version ?? 'desconocida',
        schemaVersion: schema?.user_version ?? -1,
        journalMode: journal?.journal_mode?.toLowerCase() ?? 'desconocido',
        foreignKeys: foreignKeys?.foreign_keys === 1,
      };
    });

    await database.mutate(async (tx) => {
      await tx.exec(
        'CREATE TEMP TABLE IF NOT EXISTS _listapp_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL)',
      );
      await tx.exec('DELETE FROM _listapp_probe');
    });

    let rollbackOk = false;
    try {
      await database.mutate(async (tx) => {
        await tx.run("INSERT INTO _listapp_probe (value) VALUES ('probe')");
        throw new AppError('VALIDATION', 'Rollback intencionado del diagnóstico.');
      });
    } catch {
      // El error es esperado; lo que importa es el estado final.
    }

    const remaining = await database.read(async (reader) => {
      return reader.get<{ count: number }>('SELECT COUNT(*) AS count FROM _listapp_probe');
    });
    rollbackOk = (remaining?.count ?? -1) === 0;

    return {
      ...pragmas,
      writeOk: true,
      rollbackOk,
    };
  } catch (error) {
    return {
      sqliteVersion: 'desconocida',
      schemaVersion: -1,
      journalMode: 'desconocido',
      foreignKeys: false,
      writeOk: false,
      rollbackOk: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
