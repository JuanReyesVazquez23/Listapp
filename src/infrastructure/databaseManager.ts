import { LATEST_SCHEMA_VERSION, migrations } from '@/infrastructure/migrations';
import type { Migration } from '@/infrastructure/migrations/001_initial';
import { SerialQueue } from '@/infrastructure/serialQueue';
import type { SqlDatabase, SqlReader, Tx } from '@/infrastructure/sqlDatabase';
import { AppError, isAppError } from '@/lib/errors';

export type DatabaseState = 'idle' | 'booting' | 'ready' | 'failed' | 'broken';

export interface DatabaseManagerOptions {
  openAdapter: () => Promise<SqlDatabase>;
  timeoutMs?: number;
}

/**
 * Dueño del ciclo de vida de SQLite.
 *
 * Abre la conexión una vez, aplica los PRAGMAs, migra y expone `read`/`mutate`
 * sobre una cola serial. No se reabre en caliente: si la conexión queda en un
 * estado desconocido, la app pide reiniciar.
 */
export class DatabaseManager {
  private readonly openAdapter: () => Promise<SqlDatabase>;
  private readonly queue: SerialQueue;
  private adapter: SqlDatabase | null = null;
  private state: DatabaseState = 'idle';
  private bootPromise: Promise<void> | null = null;

  constructor(options: DatabaseManagerOptions) {
    this.openAdapter = options.openAdapter;
    this.queue = new SerialQueue({
      timeoutMs: options.timeoutMs,
      onTimeout: () => {
        this.state = 'broken';
      },
    });
  }

  getState(): DatabaseState {
    return this.state;
  }

  boot(): Promise<void> {
    if (this.state === 'ready') {
      return Promise.resolve();
    }
    if (this.bootPromise) {
      return this.bootPromise;
    }

    this.state = 'booting';
    this.bootPromise = this.queue
      .enqueue(() => this.openAndMigrate())
      .then(() => {
        this.state = 'ready';
      })
      .catch(async (error: unknown) => {
        this.state = this.queue.isBroken ? 'broken' : 'failed';
        await this.closeAdapterQuietly();
        throw error;
      })
      .finally(() => {
        this.bootPromise = null;
      });

    return this.bootPromise;
  }

  read<T>(work: (db: SqlReader) => Promise<T>): Promise<T> {
    this.assertReady();
    return this.queue.enqueue(async () => {
      const adapter = this.requireAdapter();
      return work(adapter);
    });
  }

  mutate<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    this.assertReady();
    return this.queue.enqueue(async () => {
      const adapter = this.requireAdapter();

      try {
        await adapter.exec('BEGIN IMMEDIATE');
      } catch (error) {
        throw new AppError('DB_BUSY', 'No se pudo iniciar la transacción.', error);
      }

      try {
        const result = await work(adapter);
        await adapter.exec('COMMIT');
        return result;
      } catch (error) {
        return await this.recoverWriteFailure(adapter, error);
      }
    });
  }

  async close(): Promise<void> {
    if (this.state === 'idle') {
      return;
    }

    await this.queue.enqueue(async () => {
      await this.closeAdapterQuietly();
    });
    this.state = 'idle';
  }

  private async openAndMigrate(): Promise<void> {
    const adapter = await this.openAdapter();
    this.adapter = adapter;

    try {
      await adapter.exec('PRAGMA foreign_keys = ON');
      await adapter.exec('PRAGMA journal_mode = WAL');
      await adapter.exec('PRAGMA busy_timeout = 5000');
      await adapter.exec('PRAGMA synchronous = NORMAL');

      await this.verifyConfiguration(adapter);
      await this.migrate(adapter);
    } catch (error) {
      await this.closeAdapterQuietly();
      throw error;
    }
  }

  private async verifyConfiguration(adapter: SqlDatabase): Promise<void> {
    const foreignKeys = await adapter.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (foreignKeys?.foreign_keys !== 1) {
      throw new AppError('DB_CONFIG', 'No se pudo activar foreign_keys.');
    }

    const journal = await adapter.get<{ journal_mode: string }>('PRAGMA journal_mode');
    if (journal?.journal_mode?.toLowerCase() !== 'wal') {
      throw new AppError('DB_CONFIG', 'No se pudo activar el modo WAL.');
    }
  }

  private async migrate(adapter: SqlDatabase): Promise<void> {
    const versionRow = await adapter.get<{ user_version: number }>('PRAGMA user_version');
    const version = versionRow?.user_version ?? 0;

    if (!Number.isInteger(version) || version < 0) {
      throw new AppError('MIGRATION_FAILED', 'La versión del esquema no es válida.');
    }

    if (version > LATEST_SCHEMA_VERSION) {
      throw new AppError(
        'SCHEMA_TOO_NEW',
        `La base de datos usa la versión ${version}; esta app admite hasta la ${LATEST_SCHEMA_VERSION}.`,
        { detected: version, supported: LATEST_SCHEMA_VERSION },
      );
    }

    if (version === 0) {
      const tables = await adapter.get<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      );
      if ((tables?.count ?? 0) > 0) {
        throw new AppError('UNKNOWN_SCHEMA', 'La base de datos tiene tablas pero no declara versión.');
      }
    }

    if (version === LATEST_SCHEMA_VERSION) {
      await this.assertSchemaPresent(adapter);
    }

    const pending = migrations
      .filter((migration) => migration.version > version)
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      await this.runMigration(adapter, migration);
    }

    const finalRow = await adapter.get<{ user_version: number }>('PRAGMA user_version');
    if ((finalRow?.user_version ?? 0) !== LATEST_SCHEMA_VERSION) {
      throw new AppError('MIGRATION_FAILED', 'El esquema no quedó en la versión esperada.');
    }

    await this.assertSchemaPresent(adapter);
  }

  private async assertSchemaPresent(adapter: SqlDatabase): Promise<void> {
    const tables = await adapter.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('lists', 'items')",
    );
    if ((tables?.count ?? 0) !== 2) {
      throw new AppError('UNKNOWN_SCHEMA', 'Faltan tablas obligatorias del esquema.');
    }
  }

  private async runMigration(adapter: SqlDatabase, migration: Migration): Promise<void> {
    try {
      await adapter.exec('BEGIN IMMEDIATE');
    } catch (error) {
      throw new AppError('MIGRATION_FAILED', `No se pudo iniciar la migración ${migration.name}.`, error);
    }

    try {
      await migration.up(adapter);
      if (!Number.isInteger(migration.version) || migration.version <= 0) {
        throw new Error('Versión de migración inválida.');
      }
      await adapter.exec(`PRAGMA user_version = ${migration.version}`);
      await adapter.exec('COMMIT');
    } catch (error) {
      await this.rollbackOrBreak(adapter, error);
      throw new AppError('MIGRATION_FAILED', `Falló la migración ${migration.name}.`, error);
    }
  }

  private async recoverWriteFailure(adapter: SqlDatabase, original: unknown): Promise<never> {
    let rollbackError: unknown;
    try {
      await adapter.exec('ROLLBACK');
    } catch (error) {
      rollbackError = error;
    }

    const healthy = await this.probe(adapter);
    if (!healthy) {
      this.markBroken();
      throw new AppError('DB_BROKEN', 'La conexión quedó en un estado no fiable.', {
        original,
        rollbackError,
      });
    }

    if (rollbackError !== undefined) {
      throw new AppError('DB_WRITE_FAILED', 'No se pudo revertir la transacción.', {
        original,
        rollbackError,
      });
    }

    if (isAppError(original)) {
      throw original;
    }

    throw new AppError('DB_WRITE_FAILED', 'No se pudo guardar el cambio.', original);
  }

  private async rollbackOrBreak(adapter: SqlDatabase, original: unknown): Promise<void> {
    try {
      await adapter.exec('ROLLBACK');
    } catch (rollbackError) {
      const healthy = await this.probe(adapter);
      if (!healthy) {
        this.markBroken();
        throw new AppError('DB_BROKEN', 'La conexión quedó en un estado no fiable.', {
          original,
          rollbackError,
        });
      }
      throw new AppError('DB_WRITE_FAILED', 'No se pudo revertir la migración.', {
        original,
        rollbackError,
      });
    }
  }

  private async probe(adapter: SqlDatabase): Promise<boolean> {
    try {
      await adapter.exec('BEGIN IMMEDIATE');
      await adapter.exec('ROLLBACK');
      return true;
    } catch {
      return false;
    }
  }

  private markBroken(): void {
    this.state = 'broken';
    this.queue.markBroken();
  }

  private assertReady(): void {
    if (this.state !== 'ready') {
      throw new AppError('INVALID_STATE', 'La base de datos no está lista.');
    }
  }

  private requireAdapter(): SqlDatabase {
    if (!this.adapter) {
      throw new AppError('DB_CONFIG', 'La base de datos no está abierta.');
    }
    return this.adapter;
  }

  private async closeAdapterQuietly(): Promise<void> {
    const adapter = this.adapter;
    this.adapter = null;
    if (!adapter) {
      return;
    }

    try {
      await adapter.close();
    } catch (error) {
      console.warn('No se pudo cerrar la base de datos.', error);
    }
  }
}
