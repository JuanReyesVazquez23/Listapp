import { DatabaseManager } from '@/data/databaseManager';
import { ExpoSqliteAdapter } from '@/data/expoSqliteAdapter';

export const DATABASE_NAME = 'listapp.db';

let manager: DatabaseManager | null = null;

/**
 * Única instancia de `DatabaseManager` de la app.
 *
 * No se expone la conexión: las pantallas usan casos de uso que llaman a
 * `read`/`mutate`.
 */
export function getDatabase(): DatabaseManager {
  if (!manager) {
    manager = new DatabaseManager({
      openAdapter: () => ExpoSqliteAdapter.open(DATABASE_NAME),
    });
  }
  return manager;
}
