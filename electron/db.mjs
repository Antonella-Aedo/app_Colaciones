/**
 * Capa de persistencia local: SQLite (better-sqlite3) usado como document store.
 *
 * Cada colección es una tabla (id TEXT PRIMARY KEY, data TEXT JSON).
 * Los filtros usan json_extract(data, '$.campo') = ? — mismo modelo mental que
 * las colecciones de Firestore/UnQLite que reemplaza.
 *
 * Este módulo corre en el proceso principal de Electron y también en Node puro
 * (los tests lo usan con ':memory:').
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export const COLLECTIONS = [
  'productos',
  'colaciones',
  'pedidos',
  'clientes',
  'usuariosPermitidos',
];

const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

function assertCollection(col) {
  if (!COLLECTIONS.includes(col)) {
    throw new Error(`Colección desconocida: "${col}". Válidas: ${COLLECTIONS.join(', ')}`);
  }
}

function assertField(field) {
  if (typeof field !== 'string' || !FIELD_RE.test(field)) {
    throw new Error(`Campo inválido para query: ${JSON.stringify(field)}`);
  }
}

/** better-sqlite3 no acepta booleanos; JSON true/false se extrae como 1/0. */
function bindable(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
}

/**
 * Crea (o abre) la base de datos.
 * @param {string} filename ruta del archivo .db, o ':memory:' para tests.
 */
export function createDb(filename = ':memory:') {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  for (const col of COLLECTIONS) {
    db.exec(`CREATE TABLE IF NOT EXISTS "${col}" (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }

  const toDoc = (row) => (row ? { id: row.id, ...JSON.parse(row.data) } : null);

  const ops = {
    /** Lista todos los documentos, opcionalmente ordenados por un campo. */
    list(col, opts = {}) {
      assertCollection(col);
      const { orderBy = null, desc = false, limit = 0, offset = 0 } = opts;
      let sql = `SELECT id, data FROM "${col}"`;
      if (orderBy) {
        assertField(orderBy);
        sql += ` ORDER BY json_extract(data, '$.${orderBy}') ${desc ? 'DESC' : 'ASC'}, id`;
      }
      if (limit > 0) sql += ` LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset) || 0}`;
      return db.prepare(sql).all().map(toDoc);
    },

    get(col, id) {
      assertCollection(col);
      const row = db.prepare(`SELECT id, data FROM "${col}" WHERE id = ?`).get(id);
      return toDoc(row);
    },

    /** Igualdad simple sobre campos del documento: { campo: valor }. */
    find(col, where = {}, opts = {}) {
      assertCollection(col);
      const entries = Object.entries(where);
      let sql = `SELECT id, data FROM "${col}"`;
      if (entries.length > 0) {
        sql += ' WHERE ' + entries.map(([f]) => {
          assertField(f);
          return `json_extract(data, '$.${f}') = ?`;
        }).join(' AND ');
      }
      if (opts.orderBy) {
        assertField(opts.orderBy);
        sql += ` ORDER BY json_extract(data, '$.${opts.orderBy}') ${opts.desc ? 'DESC' : 'ASC'}, id`;
      }
      const params = entries.map(([, v]) => bindable(v));
      return db.prepare(sql).all(...params).map(toDoc);
    },

    /** Inserta un documento nuevo; genera el id si no viene en data.id. */
    insert(col, data) {
      assertCollection(col);
      const { id, ...rest } = data ?? {};
      const docId = typeof id === 'string' && id ? id : randomUUID();
      db.prepare(`INSERT INTO "${col}" (id, data) VALUES (?, ?)`).run(docId, JSON.stringify(rest));
      return { id: docId, ...rest };
    },

    /** Reemplazo total del documento (insert-or-replace). */
    replace(col, id, data) {
      assertCollection(col);
      if (!id) throw new Error('replace requiere id');
      const { id: _omit, ...rest } = data ?? {};
      db.prepare(`INSERT OR REPLACE INTO "${col}" (id, data) VALUES (?, ?)`).run(id, JSON.stringify(rest));
      return { id, ...rest };
    },

    /** Merge superficial del patch sobre el documento existente. */
    update(col, id, patch) {
      assertCollection(col);
      if (!id) throw new Error('update requiere id');
      const row = db.prepare(`SELECT data FROM "${col}" WHERE id = ?`).get(id);
      if (!row) return null;
      const current = JSON.parse(row.data);
      const merged = { ...current, ...patch };
      db.prepare(`UPDATE "${col}" SET data = ? WHERE id = ?`).run(JSON.stringify(merged), id);
      return { id, ...merged };
    },

    remove(col, id) {
      assertCollection(col);
      db.prepare(`DELETE FROM "${col}" WHERE id = ?`).run(id);
      return { id };
    },

    count(col) {
      assertCollection(col);
      return db.prepare(`SELECT COUNT(*) AS n FROM "${col}"`).get().n;
    },

    /**
     * Ejecuta una lista de ops primitivas en una transacción (todo o nada).
     * ops: [{ type: 'insert'|'replace'|'update'|'remove', col, id?, data? }]
     */
    tx(opsList) {
      const run = db.transaction((list) => {
        const results = [];
        for (const op of list) {
          const { type, col } = op;
          if (type === 'insert') results.push(ops.insert(col, op.data));
          else if (type === 'replace') results.push(ops.replace(col, op.id, op.data));
          else if (type === 'update') results.push(ops.update(col, op.id, op.data));
          else if (type === 'remove') results.push(ops.remove(col, op.id));
          else throw new Error(`tx: op desconocida "${type}"`);
        }
        return results;
      });
      return run(opsList);
    },

    close() {
      db.close();
    },
  };

  return ops;
}
