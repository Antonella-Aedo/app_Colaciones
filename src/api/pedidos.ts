import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  limit,
  startAfter,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { CambioEstado, EstadoPago, Pedido, PedidoInput } from '../types';
import { PedidoInputSchema, EstadoPedidoSchema } from './schemas';
import { DELIVERY_COST } from '../constants/delivery';
import { esEditable, esEliminable, puedeTransicionar } from '../utils/pedidoEstado';

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

/**
 * Calcula el deliveryCost según tipoEntrega.
 * delivery → DELIVERY_COST (1300); retiro → 0.
 */
function calcularDeliveryCost(tipoEntrega: string): number {
  return tipoEntrega === 'delivery' ? DELIVERY_COST : 0;
}

/**
 * Calcula el total: Σ(precio×cantidad) + deliveryCost.
 */
function calcularTotal(items: { precio: number; cantidad: number }[], deliveryCost: number): number {
  const subtotal = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  return subtotal + deliveryCost;
}

/**
 * Consulta si ya existe otro pedido con la misma dirección en la misma fecha.
 * Retorna los pedidos que coinciden (excluyendo excludeId si se provee).
 * Es informativo: no bloquea ni cambia el deliveryCost.
 */
export async function verificarDireccionDuplicada(
  direccion: string,
  fecha: string,
  excludeId?: string,
): Promise<Pedido[]> {
  const q = query(
    collection(db, COL),
    where('clienteDireccion', '==', direccion),
    where('fecha', '==', fecha),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== excludeId)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Pedido, 'id'>) }));
}

export async function createPedido(input: PedidoInput): Promise<Pedido> {
  const validado = PedidoInputSchema.parse(input);
  // La API es source of truth: recalcula deliveryCost y total
  const deliveryCost = calcularDeliveryCost(validado.tipoEntrega);
  const total = calcularTotal(validado.items, deliveryCost);
  // estadoPago inicial: efectivo → 'pagado' si el caller lo indica, resto → 'pendiente'
  // Por defecto, estadoPago = 'pendiente' (se marca pagado via confirmarPago o changeEstado)
  const data = {
    ...validado,
    estado: 'creado' as const,
    deliveryCost,
    total,
    estadoPago: validado.estadoPago ?? ('pendiente' as EstadoPago),
  };
  const ref = await addDoc(collection(db, COL), data);
  return { id: ref.id, ...data };
}

export async function updatePedido(id: string, input: PedidoInput): Promise<Pedido> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID de pedido inválido: se requiere un string no vacío');
  }
  const validado = PedidoInputSchema.parse(input);
  // Leer el doc actual para validar editabilidad y preservar estado/auditoría
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) throw new Error(`Pedido ${id} no encontrado`);
  const actual = snap.data() as Pedido;

  // Req 5: bloquear edición si el estado no es editable
  if (!esEditable(actual.estado)) {
    throw new Error(`No se puede editar un pedido en estado "${actual.estado}"`);
  }

  // La API recalcula deliveryCost y total
  const deliveryCost = calcularDeliveryCost(validado.tipoEntrega);
  const total = calcularTotal(validado.items, deliveryCost);

  // Preserva el estado existente si el caller no lo provee
  let estado = validado.estado;
  if (estado === undefined) {
    estado = actual.estado;
  } else {
    // Si se provee estado, validar transición
    if (!puedeTransicionar(actual.estado, estado)) {
      throw new Error(`Transición inválida: ${actual.estado} → ${estado}`);
    }
  }

  const data = {
    ...validado,
    estado,
    deliveryCost,
    total,
    estadoPago: validado.estadoPago ?? actual.estadoPago ?? ('pendiente' as EstadoPago),
  };
  await setDoc(doc(db, COL, id), data);
  return { id, ...data };
}

/**
 * Cambia el estado de un pedido con auditoría (updateDoc + arrayUnion).
 * Registra quién y cuándo cambió el estado en historialEstados.
 * NO usa setDoc (que borraría el historial).
 */
export async function cambiarEstadoPedido(
  id: string,
  nuevoEstado: Pedido['estado'],
  usuarioEmail: string,
): Promise<Pedido> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID de pedido inválido: se requiere un string no vacío');
  }
  const validadoEstado = EstadoPedidoSchema.parse(nuevoEstado);
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) throw new Error(`Pedido ${id} no encontrado`);
  const actual = snap.data() as Pedido;

  // Validar transición
  if (!puedeTransicionar(actual.estado, validadoEstado)) {
    throw new Error(`Transición inválida: ${actual.estado} → ${validadoEstado}`);
  }

  const cambio: CambioEstado = {
    estado: validadoEstado,
    cambiadoPor: usuarioEmail,
    cambiadoEn: new Date().toISOString(),
  };

  // Si el nuevo estado es 'pagado', sincronizar estadoPago
  const estadoPagoUpdate: Partial<Pedido> =
    validadoEstado === 'pagado' ? { estadoPago: 'pagado' as EstadoPago } : {};

  await updateDoc(doc(db, COL, id), {
    estado: validadoEstado,
    estadoActualizadoPor: usuarioEmail,
    estadoActualizadoEn: cambio.cambiadoEn,
    historialEstados: arrayUnion(cambio),
    ...estadoPagoUpdate,
  });

  return { ...actual, estado: validadoEstado, estadoActualizadoPor: usuarioEmail, estadoActualizadoEn: cambio.cambiadoEn, ...estadoPagoUpdate };
}

/**
 * Confirma el pago de un pedido (para métodos diferidos: tarjeta, transferencia).
 * Setea estadoPago='pagado' y estado='pagado' atómicamente.
 */
export async function confirmarPago(id: string, usuarioEmail: string): Promise<Pedido> {
  return cambiarEstadoPedido(id, 'pagado', usuarioEmail);
}

export async function deletePedido(id: string): Promise<{ id: string }> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID de pedido inválido: se requiere un string no vacío');
  }
  // Req 5: bloquear eliminación si el estado no es eliminable
  const snap = await getDoc(doc(db, COL, id));
  if (snap.exists()) {
    const actual = snap.data() as Pedido;
    if (!esEliminable(actual.estado)) {
      throw new Error(`No se puede eliminar un pedido en estado "${actual.estado}"`);
    }
  }
  await deleteDoc(doc(db, COL, id));
  return { id };
}
