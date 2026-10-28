import { migration001, type Migration } from '@/data/migrations/001_initial';

export const LATEST_SCHEMA_VERSION = 1;

export const migrations: readonly Migration[] = [migration001];
