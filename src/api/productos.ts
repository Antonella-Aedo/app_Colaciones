import { dbInvoke } from './clientDb';
import type { Producto, ProductoInput } from '../types';
import { ProductoInputSchema } from './schemas';

const COL = 'productos';

export async function getProductos(): Promise<Producto[]> {
  return dbInvoke<Producto[]>('list', COL, { orderBy: 'nombre' });
}

/**
 * Obtiene productos paginados (ordenados por nombre).
 * `startAfterId` es un cursor opaco (offset serializado) devuelto como
 * `lastDocId` por la página anterior.
 */
export async function getProductosPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Producto[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  const offset = opts?.startAfterId ? Number.parseInt(opts.startAfterId, 10) : 0;
  const docs = await dbInvoke<Producto[]>('list', COL, {
    orderBy: 'nombre',
    limit: lim + 1,
    offset,
  });
  const hasMore = docs.length > lim;
  const items = hasMore ? docs.slice(0, lim) : docs;
  const lastDocId = hasMore ? String(offset + items.length) : null;
  return { items, hasMore, lastDocId };
}

export async function createProducto(producto: ProductoInput): Promise<Producto> {
  const validado = ProductoInputSchema.parse(producto);
  return dbInvoke<Producto>('insert', COL, validado);
}

export async function updateProducto(id: string, producto: ProductoInput): Promise<Producto> {
  const validado = ProductoInputSchema.parse(producto);
  return dbInvoke<Producto>('replace', COL, id, validado);
}

export async function deleteProducto(id: string): Promise<{ id: string }> {
  return dbInvoke<{ id: string }>('remove', COL, id);
}
