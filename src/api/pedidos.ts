import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  limit,
  startAfter,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Pedido, PedidoInput } from '../types';
import { PedidoInputSchema } from './schemas';

const COL = 'pedidos';

export async function getPedidos(): Promise<Pedido[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) }));
}

/**
 * Obtiene pedidos paginados (ordenados por fecha descendente) usando cursor-based pagination.
 * Mantiene getPedidos() sin cambios para retrocompatibilidad.
 */
export async function getPedidosPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Pedido[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  let q = query(collection(db, COL), orderBy('fecha', 'desc'), limit(lim));
  if (opts?.startAfterId) {
    q = query(collection(db, COL), orderBy('fecha', 'desc'), startAfter(doc(db, COL, opts.startAfterId)), limit(lim));
  }
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) }));
  const hasMore = items.length === lim;
  const lastDocId = items.length > 0 ? items[items.length - 1].id : null;
  return { items, hasMore, lastDocId };
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Pedido, 'id'>) };
}

export async function createPedido(input: PedidoInput): Promise<Pedido> {
  const validado = PedidoInputSchema.parse(input);
  const ref = await addDoc(collection(db, COL), { ...validado, estado: 'pendiente' });
  return { id: ref.id, ...validado, estado: 'pendiente' };
}

export async function updatePedido(id: string, input: PedidoInput): Promise<Pedido> {
  const validado = PedidoInputSchema.parse(input);
  // Preserva el estado existente si el caller no lo provee.
  // setDoc reemplaza el documento completo, así que leemos el doc actual
  // para no perder el estado cuando input.estado es undefined.
  let estado = validado.estado;
  if (estado === undefined) {
    const snap = await getDoc(doc(db, COL, id));
    estado = snap.exists() ? (snap.data() as Pedido).estado : 'pendiente';
  }
  const data = { ...validado, estado };
  await setDoc(doc(db, COL, id), data);
  return { id, ...data };
}

export async function deletePedido(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}
