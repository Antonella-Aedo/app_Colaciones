import { dbInvoke, type TxOp } from './clientDb';
import type { Colacion, ColacionInput } from '../types';
import { ColacionInputSchema } from './schemas';

const COL = 'colaciones';

export async function getColaciones(): Promise<Colacion[]> {
  return dbInvoke<Colacion[]>('list', COL, { orderBy: 'fecha', desc: true });
}

/**
 * Obtiene colaciones paginadas (ordenadas por fecha descendente).
 * `startAfterId` es un cursor opaco (offset serializado) devuelto como
 * `lastDocId` por la página anterior.
 */
export async function getColacionesPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Colacion[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  const offset = opts?.startAfterId ? Number.parseInt(opts.startAfterId, 10) : 0;
  const docs = await dbInvoke<Colacion[]>('list', COL, {
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

export async function getColacion(id: string): Promise<Colacion | null> {
  return dbInvoke<Colacion | null>('get', COL, id);
}

export async function getColacionActiva(): Promise<Colacion | null> {
  const docs = await dbInvoke<Colacion[]>('find', COL, { activa: true });
  return docs[0] ?? null;
}

/** Ops para desactivar todas las colaciones activas salvo `exceptId`. */
async function opsDesactivar(exceptId?: string): Promise<TxOp[]> {
  const activas = await dbInvoke<Colacion[]>('find', COL, { activa: true });
  return activas
    .filter((c) => c.id !== exceptId)
    .map((c) => ({ type: 'update' as const, col: COL, id: c.id, data: { activa: false } }));
}

export async function createColacion(input: ColacionInput): Promise<Colacion> {
  const validado = ColacionInputSchema.parse(input);
  if (!validado.activa) {
    return dbInvoke<Colacion>('insert', COL, validado);
  }
  // Solo una activa a la vez: desactivar las demás + insertar en una transacción.
  const ops = await opsDesactivar();
  ops.push({ type: 'insert', col: COL, data: validado });
  const results = await dbInvoke<Colacion[]>('tx', ops);
  return results[results.length - 1];
}

export async function updateColacion(id: string, input: ColacionInput): Promise<Colacion> {
  const validado = ColacionInputSchema.parse(input);
  if (!validado.activa) {
    return dbInvoke<Colacion>('replace', COL, id, validado);
  }
  const ops = await opsDesactivar(id);
  ops.push({ type: 'replace', col: COL, id, data: validado });
  const results = await dbInvoke<Colacion[]>('tx', ops);
  return results[results.length - 1];
}

export async function deleteColacion(id: string): Promise<{ id: string }> {
  return dbInvoke<{ id: string }>('remove', COL, id);
}

/** Marca una colación como activa (menú del día) y desactiva las demás. */
export async function activarColacion(id: string): Promise<void> {
  const ops = await opsDesactivar(id);
  ops.push({ type: 'update', col: COL, id, data: { activa: true } });
  await dbInvoke('tx', ops);
}
