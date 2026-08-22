import { vi } from 'vitest';

/**
 * Mock de firebase/firestore para tests.
 * El store se crea con vi.hoisted para que esté disponible en el factory de vi.mock.
 */

type DocData = Record<string, unknown>;

const hoisted = vi.hoisted(() => {
  const store = new Map<string, Map<string, DocData>>();

  function getCollection(name: string): Map<string, DocData> {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  }

  function resetStore() {
    store.clear();
  }

  return { store, getCollection, resetStore };
});

interface FakeDocRef { id: string; col: string; }
interface FakeColRef { id: string; }
interface FakeFilter { field: string; op: '==' | '!=' | string; value: unknown; }
interface FakeQuery { __collection: string; __filters: FakeFilter[]; }

vi.mock('firebase/firestore', () => {
  const { getCollection } = hoisted;

  /**
   * Replica la validacion del SDK real: Firestore RECHAZA cualquier valor
   * `undefined` (a cualquier profundidad) con
   *   "Unsupported field value: undefined (found in field X in document Y)".
   * El mock antes lo aceptaba en silencio, asi que los tests pasaban con
   * payloads que reventaban en produccion. Recorre objetos y arrays igual
   * que el SDK.
   */
  function rechazarUndefined(value: unknown, ref: FakeDocRef | FakeColRef, path = ''): void {
    if (value === undefined) {
      const doc = 'col' in ref ? `${ref.col}/${ref.id}` : ref.id;
      throw new Error(
        `Function set() called with invalid data. Unsupported field value: undefined` +
          `${path ? ` (found in field ${path})` : ''} (found in document ${doc})`,
      );
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => rechazarUndefined(v, ref, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        rechazarUndefined(v, ref, path ? `${path}.${k}` : k);
      }
    }
  }

  return {
    collection: (_db: unknown, name: string): FakeColRef => ({ id: name }),
    // Soporta dos formas: doc(db, col, id) y doc(collectionRef) (auto-id).
    doc: (...args: unknown[]): FakeDocRef => {
      if (args.length >= 3) {
        return { id: args[2] as string, col: args[1] as string };
      }
      // doc(collectionRef) → genera id automático
      const colRef = args[0] as FakeColRef;
      const id = `auto-${Math.random().toString(36).slice(2, 9)}`;
      return { id, col: colRef.id };
    },
    getDocs: async (ref: FakeColRef | FakeQuery) => {
      let colName: string;
      let filters: FakeFilter[] = [];
      if (ref && typeof ref === 'object' && '__filters' in ref) {
        colName = (ref as FakeQuery).__collection;
        filters = (ref as FakeQuery).__filters;
      } else {
        colName = (ref as FakeColRef).id;
      }
      const col = getCollection(colName);
      let docs = Array.from(col.entries()).map(([id, data]) => ({
        id,
        data: () => ({ ...data }),
        exists: () => true as const,
        ref: { id, col: colName } as FakeDocRef,
      }));
      if (filters.length > 0) {
        docs = docs.filter((d) => filters.every((f) => {
          const val = (d.data() as DocData)[f.field];
          if (f.op === '==') return val === f.value;
          if (f.op === '!=') return val !== f.value;
          return true;
        }));
      }
      return { docs, empty: docs.length === 0 };
    },
    getDoc: async (ref: FakeDocRef) => {
      const col = getCollection(ref.col);
      if (!col.has(ref.id)) return { id: ref.id, data: () => undefined, exists: () => false as const };
      return { id: ref.id, data: () => ({ ...col.get(ref.id)! }), exists: () => true as const };
    },
    addDoc: async (ref: FakeColRef, data: DocData) => {
      rechazarUndefined(data, ref);
      const id = `auto-${Math.random().toString(36).slice(2, 9)}`;
      getCollection(ref.id).set(id, { ...data });
      return { id, col: ref.id } as FakeDocRef;
    },
    setDoc: async (ref: FakeDocRef, data: DocData) => {
      rechazarUndefined(data, ref);
      getCollection(ref.col).set(ref.id, { ...data });
    },
    updateDoc: async (ref: FakeDocRef, data: Partial<DocData>) => {
      rechazarUndefined(data, ref);
      const col = getCollection(ref.col);
      if (!col.has(ref.id)) return;
      const existing = col.get(ref.id)!;
      const merged: DocData = { ...existing };
      for (const [key, value] of Object.entries(data)) {
        // Detectar arrayUnion y concatenar al array existente
        if (value && typeof value === 'object' && '__arrayUnion' in value) {
          const arr = Array.isArray(existing[key]) ? existing[key] as unknown[] : [];
          merged[key] = [...arr, ...(value as { __arrayUnion: true; elements: unknown[] }).elements];
        } else {
          merged[key] = value;
        }
      }
      col.set(ref.id, merged);
    },
    deleteDoc: async (ref: FakeDocRef) => {
      getCollection(ref.col).delete(ref.id);
    },
    query: (ref: FakeColRef, ...constraints: unknown[]): FakeQuery => ({
      __collection: ref.id,
      __filters: constraints.filter((c): c is FakeFilter =>
        !!c && typeof c === 'object' && 'field' in (c as Record<string, unknown>),
      ),
    }),
    where: (field: string, op: string, value: unknown): FakeFilter => ({ field, op, value }),
    writeBatch: () => {
      const ops: Array<() => void> = [];
      return {
        set: (ref: FakeDocRef, data: DocData) => {
          rechazarUndefined(data, ref);
          ops.push(() => getCollection(ref.col).set(ref.id, { ...data }));
        },
        update: (ref: FakeDocRef, data: Partial<DocData>) => {
          rechazarUndefined(data, ref);
          ops.push(() => {
            const col = getCollection(ref.col);
            if (!col.has(ref.id)) return;
            const existing = col.get(ref.id)!;
            const merged: DocData = { ...existing };
            for (const [key, value] of Object.entries(data)) {
              if (value && typeof value === 'object' && '__arrayUnion' in value) {
                const arr = Array.isArray(existing[key]) ? existing[key] as unknown[] : [];
                merged[key] = [...arr, ...(value as { __arrayUnion: true; elements: unknown[] }).elements];
              } else {
                merged[key] = value;
              }
            }
            col.set(ref.id, merged);
          });
        },
        commit: async () => { ops.forEach((op) => op()); },
      };
    },
    // arrayUnion: marca un valor para que updateDoc lo concatene al array existente.
    // Se representa como un objeto con tag __arrayUnion; updateDoc lo detecta y concatena.
    arrayUnion: (...elements: unknown[]): { __arrayUnion: true; elements: unknown[] } => ({
      __arrayUnion: true,
      elements,
    }),
  };
});

vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('../../src/firebase/config', () => ({ db: {} }));

export const resetStore = hoisted.resetStore;
export const store = hoisted.store;
