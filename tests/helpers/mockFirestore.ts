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

vi.mock('firebase/firestore', () => {
  const { getCollection } = hoisted;
  return {
    collection: (_db: unknown, name: string): FakeColRef => ({ id: name }),
    doc: (_db: unknown, col: string, id: string): FakeDocRef => ({ id, col }),
    getDocs: async (ref: FakeColRef) => {
      const col = getCollection(ref.id);
      const docs = Array.from(col.entries()).map(([id, data]) => ({
        id,
        data: () => ({ ...data }),
        exists: () => true as const,
        ref: { id, col: ref.id } as FakeDocRef,
      }));
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
    query: (ref: FakeColRef) => ref,
    where: () => ({ __where: true }),
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
