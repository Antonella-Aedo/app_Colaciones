import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  limit,
  startAfter,
  orderBy,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Colacion, ColacionInput } from '../types';
import { ColacionInputSchema } from './schemas';

const COL = 'colaciones';

export async function getColaciones(): Promise<Colacion[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Colacion, 'id'>) }));
}

/**
 * Obtiene colaciones paginadas (ordenadas por fecha descendente) usando cursor-based pagination.
 * Mantiene getColaciones() sin cambios para retrocompatibilidad.
 */
export async function getColacionesPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Colacion[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  let q = query(collection(db, COL), orderBy('fecha', 'desc'), limit(lim));
  if (opts?.startAfterId) {
    q = query(collection(db, COL), orderBy('fecha', 'desc'), startAfter(doc(db, COL, opts.startAfterId)), limit(lim));
  }
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Colacion, 'id'>) }));
  const hasMore = items.length === lim;
  const lastDocId = items.length > 0 ? items[items.length - 1].id : null;
  return { items, hasMore, lastDocId };
}

export async function getColacion(id: string): Promise<Colacion | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Colacion, 'id'>) };
}

export async function getColacionActiva(): Promise<Colacion | null> {
  const q = query(collection(db, COL), where('activa', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Colacion, 'id'>) };
}

export async function createColacion(input: ColacionInput): Promise<Colacion> {
  const validado = ColacionInputSchema.parse(input);
  let ref: DocumentReference;
  if (validado.activa) {
    // desactivar las demás en batch (solo una activa a la vez)
    const batch = writeBatch(db);
    const q = query(collection(db, COL), where('activa', '==', true));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => batch.update(d.ref, { activa: false }));
    ref = doc(collection(db, COL));
    batch.set(ref, validado);
    await batch.commit();
  } else {
    ref = await addDoc(collection(db, COL), validado);
  }
  return { id: ref.id, ...validado };
}

export async function updateColacion(id: string, input: ColacionInput): Promise<Colacion> {
  const validado = ColacionInputSchema.parse(input);
  if (validado.activa) {
    // desactivar las demás (excluyendo esta)
    const batch = writeBatch(db);
    const q = query(collection(db, COL), where('activa', '==', true));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (d.id !== id) batch.update(d.ref, { activa: false });
    });
    batch.set(doc(db, COL, id), validado);
    await batch.commit();
  } else {
    await setDoc(doc(db, COL, id), validado);
  }
  return { id, ...validado };
}

export async function deleteColacion(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}

/** Marca una colación como activa (menú del día) y desactiva las demás. */
export async function activarColacion(id: string): Promise<void> {
  const batch = writeBatch(db);
  const q = query(collection(db, COL), where('activa', '==', true));
  const snap = await getDocs(q);
  snap.docs.forEach((d) => {
    if (d.id !== id) batch.update(d.ref, { activa: false });
  });
  batch.update(doc(db, COL, id), { activa: true });
  await batch.commit();
}
