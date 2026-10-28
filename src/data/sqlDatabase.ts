export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export interface SqlRunResult {
  changes: number;
  lastInsertRowId: number | bigint;
}

export interface SqlReader {
  get<T>(sql: string, params?: SqlParams): Promise<T | null>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
}

/**
 * Contrato que reciben los repositorios. Un `Tx` solo existe dentro de una
 * operación encolada; no se guarda ni se comparte entre pantallas.
 */
export interface Tx extends SqlReader {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<SqlRunResult>;
}

export interface SqlDatabase extends Tx {
  close(): Promise<void>;
}
