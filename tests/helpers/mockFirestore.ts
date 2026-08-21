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
      const id = `auto-${Math.random().toString(36).slice(2, 9)}`;
      getCollection(ref.id).set(id, { ...data });
      return { id, col: ref.id } as FakeDocRef;
    },
    setDoc: async (ref: FakeDocRef, data: DocData) => {
      getCollection(ref.col).set(ref.id, { ...data });
    },
    updateDoc: async (ref: FakeDocRef, data: Partial<DocData>) => {
      const col = getCollection(ref.col);
      if (col.has(ref.id)) col.set(ref.id, { ...col.get(ref.id)!, ...data });
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
          ops.push(() => getCollection(ref.col).set(ref.id, { ...data }));
        },
        update: (ref: FakeDocRef, data: Partial<DocData>) => {
          ops.push(() => {
            const col = getCollection(ref.col);
            if (col.has(ref.id)) col.set(ref.id, { ...col.get(ref.id)!, ...data });
          });
        },
        commit: async () => { ops.forEach((op) => op()); },
      };
    },
  };
});

vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('../../src/firebase/config', () => ({ db: {} }));

export const resetStore = hoisted.resetStore;
export const store = hoisted.store;
