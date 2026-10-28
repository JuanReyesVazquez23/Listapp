import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DatabaseManager } from '@/data/databaseManager';
import type { UseCaseDeps } from '@/useCases/types';
import { NodeSqliteAdapter } from './nodeSqliteAdapter';

export interface TestContext {
  manager: DatabaseManager;
  deps: UseCaseDeps;
  dbPath: string;
  setNow(date: Date): void;
  cleanup(): Promise<void>;
}

export async function createTestContext(
  initialNow: Date = new Date('2026-10-27T18:42:00'),
): Promise<TestContext> {
  const dir = mkdtempSync(join(tmpdir(), 'listapp-test-'));
  const dbPath = join(dir, 'test.db');
  const manager = new DatabaseManager({
    openAdapter: () => NodeSqliteAdapter.open(dbPath),
  });
  await manager.boot();

  let currentNow = new Date(initialNow.getTime());
  let idCounter = 0;

  const deps: UseCaseDeps = {
    database: manager,
    clock: { now: () => new Date(currentNow.getTime()) },
    createId: () => {
      idCounter += 1;
      return `id-${idCounter}`;
    },
  };

  return {
    manager,
    deps,
    dbPath,
    setNow(date: Date) {
      currentNow = new Date(date.getTime());
    },
    async cleanup() {
      await manager.close();
      if (manager.getState() !== 'broken') {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}
