import { dbInvoke } from './clientDb';
import type { CambioEstado, EstadoPago, Pedido, PedidoInput } from '../types';
import { PedidoInputSchema, EstadoPedidoSchema } from './schemas';
import { DELIVERY_COST } from '../constants/delivery';
import { esEditable, esEliminable, puedeTransicionar } from '../utils/pedidoEstado';

const COL = 'pedidos';

export async function getPedidos(): Promise<Pedido[]> {
  return dbInvoke<Pedido[]>('list', COL, { orderBy: 'fecha', desc: true });
}

/**
 * Obtiene pedidos paginados (ordenados por fecha descendente).
 * `startAfterId` es un cursor opaco (offset serializado) devuelto como
 * `lastDocId` por la página anterior.
 */
export async function getPedidosPaginated(
  opts?: { limit?: number; startAfterId?: string },
): Promise<{ items: Pedido[]; hasMore: boolean; lastDocId: string | null }> {
  const lim = opts?.limit ?? 50;
  const offset = opts?.startAfterId ? Number.parseInt(opts.startAfterId, 10) : 0;
  const docs = await dbInvoke<Pedido[]>('list', COL, {
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

export async function getPedido(id: string): Promise<Pedido | null> {
  return dbInvoke<Pedido | null>('get', COL, id);
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
  const docs = await dbInvoke<Pedido[]>('find', COL, {
    clienteDireccion: direccion,
    fecha,
  });
  return docs.filter((d) => d.id !== excludeId);
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
  return dbInvoke<Pedido>('insert', COL, data);
}

export async function updatePedido(id: string, input: PedidoInput): Promise<Pedido> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID de pedido inválido: se requiere un string no vacío');
  }
  const validado = PedidoInputSchema.parse(input);
  // Leer el doc actual para validar editabilidad y preservar estado/auditoría
  const actual = await dbInvoke<Pedido | null>('get', COL, id);
  if (!actual) throw new Error(`Pedido ${id} no encontrado`);

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
    // Preservar campos de auditoría existentes (el input no los trae)
    estadoActualizadoPor: actual.estadoActualizadoPor,
    estadoActualizadoEn: actual.estadoActualizadoEn,
    historialEstados: actual.historialEstados,
  };
  return dbInvoke<Pedido>('replace', COL, id, data);
}

/**
 * Cambia el estado de un pedido con auditoría.
 * Registra quién y cuándo cambió el estado en historialEstados
 * (merge de campos sobre el documento — nunca pisa el historial).
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
  const actual = await dbInvoke<Pedido | null>('get', COL, id);
  if (!actual) throw new Error(`Pedido ${id} no encontrado`);

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

  const patch = {
    estado: validadoEstado,
    estadoActualizadoPor: usuarioEmail,
    estadoActualizadoEn: cambio.cambiadoEn,
    historialEstados: [...(actual.historialEstados ?? []), cambio],
    ...estadoPagoUpdate,
  };

  const actualizado = await dbInvoke<Pedido | null>('update', COL, id, patch);
  if (!actualizado) throw new Error(`Pedido ${id} no encontrado`);
  return actualizado;
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
  const actual = await dbInvoke<Pedido | null>('get', COL, id);
  if (actual && !esEliminable(actual.estado)) {
    throw new Error(`No se puede eliminar un pedido en estado "${actual.estado}"`);
  }
  return dbInvoke<{ id: string }>('remove', COL, id);
}
