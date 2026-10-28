import type { DatabaseManager } from '@/infrastructure/databaseManager';
import type { Clock } from '@/lib/clock';
import type { IdGenerator } from '@/lib/ids';

/** Dependencias inyectables para que los casos de uso se prueben sin Expo. */
export interface UseCaseDeps {
  database: DatabaseManager;
  clock: Clock;
  createId: IdGenerator;
}
