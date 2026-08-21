import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  limit,
  startAfter,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Producto, ProductoInput } from '../types';
import { ProductoInputSchema } from './schemas';

const COL = 'productos';

export async function getProductos(): Promise<Producto[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Producto, 'id'>) }));
}

/**
 * Obtiene productos paginados (ordenados por nombre) usando cursor-based pagination.
 * Mantiene getProductos() sin cambios para retrocompatibilidad.
 */
export async function getProductosPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Producto[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  let q = query(collection(db, COL), orderBy('nombre'), limit(lim));
  if (opts?.startAfterId) {
    q = query(collection(db, COL), orderBy('nombre'), startAfter(doc(db, COL, opts.startAfterId)), limit(lim));
  }
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Producto, 'id'>) }));
  const hasMore = items.length === lim;
  const lastDocId = items.length > 0 ? items[items.length - 1].id : null;
  return { items, hasMore, lastDocId };
}

export async function createProducto(producto: ProductoInput): Promise<Producto> {
  const validado = ProductoInputSchema.parse(producto);
  const ref = await addDoc(collection(db, COL), validado);
  return { id: ref.id, ...validado };
}

export async function updateProducto(id: string, producto: ProductoInput): Promise<Producto> {
  const validado = ProductoInputSchema.parse(producto);
  await setDoc(doc(db, COL, id), validado);
  return { id, ...validado };
}

export async function deleteProducto(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}
