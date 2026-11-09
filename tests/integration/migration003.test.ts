import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DatabaseManager } from '@/infrastructure/databaseManager';
import { migration001 } from '@/infrastructure/migrations/001_initial';
import { migration002 } from '@/infrastructure/migrations/002_item_details';
import { NodeSqliteAdapter } from './nodeSqliteAdapter';

/**
 * La migración 003 se prueba contra una base real en la versión 2, no solo
 * sobre una base recién creada: el riesgo está en reconstruir `lists` e `items`
 * con datos y claves foráneas ya existentes.
 */
describe('migración 003', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'listapp-migration-'));
    dbPath = join(dir, 'test.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  async function createVersion2Database(): Promise<void> {
    const adapter = NodeSqliteAdapter.open(dbPath);
    await adapter.exec('PRAGMA foreign_keys = ON');
    await migration001.up(adapter);
    await migration002.up(adapter);
    await adapter.exec(`
      INSERT INTO lists (
        id, name, status, created_at_utc, updated_at_utc,
        completed_at_utc, completed_local_date, completed_local_time,
        supermarket_name
      ) VALUES (
        'old-list', 'Compra vieja', 'completed', 1, 2,
        2, '2026-10-01', '10:00',
        'Mercadona'
      );

      INSERT INTO items (
        id, list_id, name, is_checked, checked_at_utc, sort_order,
        created_at_utc, updated_at_utc
      ) VALUES (
        'old-item', 'old-list', 'Leche', 1, 2, 1, 1, 2
      );

      PRAGMA user_version = 2;
    `);
    await adapter.close();
  }

  it('conserva las compras antiguas con su supermercado', async () => {
    await createVersion2Database();
    const manager = new DatabaseManager({
      openAdapter: () => NodeSqliteAdapter.open(dbPath),
    });
    await manager.boot();

    const rows = await manager.read((reader) =>
      reader.all<{ id: string; supermarket_name: string | null; name: string }>(
        'SELECT id, supermarket_name, name FROM lists',
      ),
    );
    expect(rows).toEqual([
      { id: 'old-list', supermarket_name: 'Mercadona', name: 'Compra vieja' },
    ]);

    const items = await manager.read((reader) =>
      reader.all<{ id: string; list_id: string }>(
        'SELECT id, list_id FROM items',
      ),
    );
    expect(items).toEqual([{ id: 'old-item', list_id: 'old-list' }]);

    const version = await manager.read((reader) =>
      reader.get<{ user_version: number }>('PRAGMA user_version'),
    );
    expect(version?.user_version).toBe(3);

    await manager.close();
  });

  it('permite cerrar compras nuevas sin supermercado', async () => {
    await createVersion2Database();
    const manager = new DatabaseManager({
      openAdapter: () => NodeSqliteAdapter.open(dbPath),
    });
    await manager.boot();

    await manager.mutate((tx) =>
      tx.run(
        `INSERT INTO lists (
          id, name, status, created_at_utc, updated_at_utc,
          completed_at_utc, completed_local_date, completed_local_time,
          supermarket_name, shopping_mode
        ) VALUES (
          'new-list', 'Compra nueva', 'completed', 3, 4,
          4, '2026-11-01', '09:00',
          NULL, 'normal'
        )`,
      ),
    );

    const row = await manager.read((reader) =>
      reader.get<{ supermarket_name: string | null }>(
        "SELECT supermarket_name FROM lists WHERE id = 'new-list'",
      ),
    );
    expect(row?.supermarket_name).toBeNull();

    await manager.close();
  });
});
