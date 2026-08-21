import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Pedido, PedidoInput } from '../types';

const COL = 'pedidos';

export async function getPedidos(): Promise<Pedido[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) }));
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Pedido, 'id'>) };
}

export async function createPedido(input: PedidoInput): Promise<Pedido> {
  const ref = await addDoc(collection(db, COL), { ...input, estado: 'pendiente' });
  return { id: ref.id, ...input, estado: 'pendiente' };
}

export async function updatePedido(id: string, input: PedidoInput): Promise<Pedido> {
  await setDoc(doc(db, COL, id), { ...input, estado: 'pendiente' });
  return { id, ...input, estado: 'pendiente' };
}

export async function deletePedido(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}
