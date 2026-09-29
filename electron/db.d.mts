/** Tipos de electron/db.mjs (para tests y para el renderer vía IPC). */

export interface ListOptions {
  orderBy?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

export interface FindOptions {
  orderBy?: string;
  desc?: boolean;
}

export interface TxOperation {
  type: 'insert' | 'replace' | 'update' | 'remove';
  col: string;
  id?: string;
  data?: unknown;
}

export type Doc = Record<string, unknown> & { id: string };

export interface DbOps {
  list(col: string, opts?: ListOptions): Doc[];
  get(col: string, id: string): Doc | null;
  find(col: string, where?: Record<string, unknown>, opts?: FindOptions): Doc[];
  insert(col: string, data: Record<string, unknown>): Doc;
  replace(col: string, id: string, data: Record<string, unknown>): Doc;
  update(col: string, id: string, patch: Record<string, unknown>): Doc | null;
  remove(col: string, id: string): { id: string };
  count(col: string): number;
  tx(ops: TxOperation[]): unknown[];
  close(): void;
}

export declare const COLLECTIONS: string[];
export declare function createDb(filename?: string): DbOps;
