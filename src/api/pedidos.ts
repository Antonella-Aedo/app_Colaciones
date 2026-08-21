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
  // Preserva el estado existente si el caller no lo provee.
  // setDoc reemplaza el documento completo, así que leemos el doc actual
  // para no perder el estado cuando input.estado es undefined.
  let estado = input.estado;
  if (estado === undefined) {
    const snap = await getDoc(doc(db, COL, id));
    estado = snap.exists() ? (snap.data() as Pedido).estado : 'pendiente';
  }
  const data = { ...input, estado };
  await setDoc(doc(db, COL, id), data);
  return { id, ...data };
}

export async function deletePedido(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}
