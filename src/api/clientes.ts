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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Cliente, ClienteInput } from '../types';
import { ClienteInputSchema } from './schemas';

const COL = 'clientes';

export async function getClientes(): Promise<Cliente[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Cliente, 'id'>) }));
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Cliente, 'id'>) };
}

export async function createCliente(input: ClienteInput): Promise<Cliente> {
  const validado = ClienteInputSchema.parse(input);
  // Normalizar direccion y contacto para que findOrCreateCliente funcione
  const data = {
    ...validado,
    direccion: validado.direccion.trim().toLowerCase(),
    contacto: validado.contacto.trim().toLowerCase(),
  };
  const ref = await addDoc(collection(db, COL), data);
  return { id: ref.id, ...data };
}

export async function updateCliente(id: string, input: ClienteInput): Promise<Cliente> {
  const validado = ClienteInputSchema.parse(input);
  const data = {
    ...validado,
    direccion: validado.direccion.trim().toLowerCase(),
    contacto: validado.contacto.trim().toLowerCase(),
  };
  await setDoc(doc(db, COL, id), data);
  return { id, ...data };
}

export async function deleteCliente(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}

/**
 * Busca un cliente por direccion + contacto (normalizados).
 * Si existe, lo retorna; si no, lo crea. Útil para evitar duplicados
 * al registrar pedidos.
 */
export async function findOrCreateCliente(input: ClienteInput): Promise<Cliente> {
  const dirNorm = input.direccion.trim().toLowerCase();
  const contNorm = input.contacto.trim().toLowerCase();
  const q = query(
    collection(db, COL),
    where('direccion', '==', dirNorm),
    where('contacto', '==', contNorm),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<Cliente, 'id'>) };
  }
  return createCliente(input);
}
