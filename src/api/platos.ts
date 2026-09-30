import { dbInvoke } from './clientDb';
import type { Plato, PlatoInput } from '../types';
import { PlatoInputSchema } from './schemas';

const COL = 'platos';

export async function getPlatos(): Promise<Plato[]> {
  return dbInvoke<Plato[]>('list', COL, { orderBy: 'fecha', desc: true });
}

/**
 * Obtiene platos paginados (ordenados por fecha descendente).
 * `startAfterId` es un cursor opaco (offset serializado) devuelto como
 * `lastDocId` por la página anterior.
 */
export async function getPlatosPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Plato[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  const offset = opts?.startAfterId ? Number.parseInt(opts.startAfterId, 10) : 0;
  const docs = await dbInvoke<Plato[]>('list', COL, {
    orderBy: 'fecha',
    desc: true,
    limit: lim + 1,
    offset,
  });
  const hasMore = docs.length > lim;
  const items = hasMore ? docs.slice(0, lim) : docs;
  const lastDocId = hasMore ? String(offset + items.length) : null;
  return { items, hasMore, lastDocId };
}

export async function getPlato(id: string): Promise<Plato | null> {
  return dbInvoke<Plato | null>('get', COL, id);
}

/** Platos disponibles hoy — varios pueden estar activos a la vez. */
export async function getPlatosActivos(): Promise<Plato[]> {
  return dbInvoke<Plato[]>('find', COL, { activa: true });
}

export async function createPlato(input: PlatoInput): Promise<Plato> {
  const validado = PlatoInputSchema.parse(input);
  return dbInvoke<Plato>('insert', COL, validado);
}

export async function updatePlato(id: string, input: PlatoInput): Promise<Plato> {
  const validado = PlatoInputSchema.parse(input);
  return dbInvoke<Plato>('replace', COL, id, validado);
}

export async function deletePlato(id: string): Promise<{ id: string }> {
  return dbInvoke<{ id: string }>('remove', COL, id);
}

/**
 * Marca un plato como disponible hoy (o lo retira de la oferta).
 * No desactiva a los demás: varios platos pueden estar activos a la vez.
 */
export async function setPlatoActiva(id: string, activa: boolean): Promise<void> {
  await dbInvoke('update', COL, id, { activa });
}
