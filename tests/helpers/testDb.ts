/**
 * Helper de tests: instala una base SQLite :memory: REAL (electron/db.mjs)
 * detrás de window.colaciones, cumpliendo el mismo contrato que el preload
 * de Electron. Los tests de api/hooks/components corren contra la capa de
 * persistencia real, no contra un mock de Firestore.
 */
import { createDb, type DbOps } from '../../electron/db.mjs';

let currentDb: DbOps | null = null;

/** Crea una DB :memory: fresca y la expone como window.colaciones. */
export function installTestDb(): DbOps {
  currentDb?.close();
  const db = createDb(':memory:');
  currentDb = db;
  const ops = db as unknown as Record<string, (...args: unknown[]) => unknown>;
  window.colaciones = {
    invoke: (op, ...args) => Promise.resolve(ops[op](...args)),
    dbPath: () => Promise.resolve(':memory:'),
  };
  return db;
}

/** Cierra la DB y limpia window.colaciones. */
export function uninstallTestDb(): void {
  currentDb?.close();
  currentDb = null;
  delete window.colaciones;
}
