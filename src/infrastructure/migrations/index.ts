import { migration001, type Migration } from '@/infrastructure/migrations/001_initial';
import { migration002 } from '@/infrastructure/migrations/002_item_details';
import { migration003 } from '@/infrastructure/migrations/003_optional_supermarket';

export const LATEST_SCHEMA_VERSION = 3;

export const migrations: readonly Migration[] = [
  migration001,
  migration002,
  migration003,
];
