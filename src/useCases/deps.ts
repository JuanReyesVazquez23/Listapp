import { getDatabase } from '@/infrastructure/database';
import { systemClock } from '@/lib/clock';
import { generateId } from '@/lib/ids';
import type { UseCaseDeps } from '@/useCases/types';

export const appDeps: UseCaseDeps = {
  database: getDatabase(),
  clock: systemClock,
  createId: generateId,
};
