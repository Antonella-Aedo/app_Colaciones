import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Producto, ProductoInput } from '../types';

const COL = 'productos';

export async function getProductos(): Promise<Producto[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Producto, 'id'>) }));
}

export async function createProducto(producto: ProductoInput): Promise<Producto> {
  const ref = await addDoc(collection(db, COL), producto);
  return { id: ref.id, ...producto };
}

export async function updateProducto(id: string, producto: ProductoInput): Promise<Producto> {
  await setDoc(doc(db, COL, id), producto);
  return { id, ...producto };
}

export async function deleteProducto(id: string): Promise<{ id: string }> {
  await deleteDoc(doc(db, COL, id));
  return { id };
}
