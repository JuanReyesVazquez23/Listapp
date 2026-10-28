export const APP_ERROR_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'INVALID_STATE',
  'LIST_COMPLETED',
  'ACTIVE_SHOPPING_EXISTS',
  'LAST_ITEM_IN_SHOPPING',
  'NO_CHECKED',
  'EMPTY_LIST',
  'DB_BUSY',
  'DB_WRITE_FAILED',
  'DB_TIMEOUT',
  'DB_BROKEN',
  'DB_CONFIG',
  'SCHEMA_TOO_NEW',
  'MIGRATION_FAILED',
  'UNKNOWN_SCHEMA',
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
