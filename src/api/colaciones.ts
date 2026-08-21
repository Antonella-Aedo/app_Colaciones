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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Colacion, ColacionInput } from '../types';

const COL = 'colaciones';

export async function getColaciones(): Promise<Colacion[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Colacion, 'id'>) }));
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
  let ref;
  if (input.activa) {
    // desactivar las demás en batch (solo una activa a la vez)
    const batch = writeBatch(db);
    const q = query(collection(db, COL), where('activa', '==', true));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => batch.update(d.ref, { activa: false }));
    ref = doc(collection(db, COL));
    batch.set(ref, input);
    await batch.commit();
  } else {
    ref = await addDoc(collection(db, COL), input);
  }
  return { id: ref.id, ...input };
}

export async function updateColacion(id: string, input: ColacionInput): Promise<Colacion> {
  if (input.activa) {
    // desactivar las demás (excluyendo esta)
    const batch = writeBatch(db);
    const q = query(collection(db, COL), where('activa', '==', true));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (d.id !== id) batch.update(d.ref, { activa: false });
    });
    batch.set(doc(db, COL, id), input);
    await batch.commit();
  } else {
    await setDoc(doc(db, COL, id), input);
  }
  return { id, ...input };
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
