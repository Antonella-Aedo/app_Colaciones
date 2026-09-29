/**
 * Puente renderer ↔ base de datos local (SQLite en el proceso principal de
 * Electron). `window.colaciones` lo inyecta electron/preload.cjs.
 *
 * En tests, `tests/helpers/testDb.ts` instala el mismo contrato apuntando a
 * una DB SQLite :memory: real.
 */

export type DbOp =
  | 'list'
  | 'get'
  | 'find'
  | 'insert'
  | 'replace'
  | 'update'
  | 'remove'
  | 'count'
  | 'tx';

export interface ListOpts {
  orderBy?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

export interface FindOpts {
  orderBy?: string;
  desc?: boolean;
}

export interface TxOp {
  type: 'insert' | 'replace' | 'update' | 'remove';
  col: string;
  id?: string;
  data?: unknown;
}

export interface ColacionesBridge {
  invoke(op: DbOp, ...args: unknown[]): Promise<unknown>;
  dbPath(): Promise<string>;
}

declare global {
  interface Window {
    colaciones?: ColacionesBridge;
  }
}

export function dbInvoke<T = unknown>(op: DbOp, ...args: unknown[]): Promise<T> {
  const bridge = window.colaciones;
  if (!bridge) {
    return Promise.reject(
      new Error(
        'Base de datos local no disponible. Esta app corre dentro de la ' +
          'aplicación de escritorio (npm run dev / npm start / Colaciones.exe).',
      ),
    );
  }
  return bridge.invoke(op, ...args) as Promise<T>;
}
