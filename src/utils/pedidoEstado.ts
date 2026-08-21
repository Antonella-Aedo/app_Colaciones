// Helpers de dominio para estados de pedido — única fuente de verdad
// para transiciones válidas, editabilidad y terminalidad.
import type { EstadoPedido } from '../types';

// Transiciones válidas: desde → [hacia...]
export const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  creado: ['pagado', 'cancelado'],
  pagado: ['programado', 'cancelado'],
  programado: ['entregando', 'cancelado'],
  entregando: ['entregado', 'programado'],
  entregado: [],
  cancelado: [],
};

// Estados terminales (no se puede cambiar a otro estado)
export function esTerminal(estado: EstadoPedido): boolean {
  return estado === 'entregado' || estado === 'cancelado';
}

// ¿Se puede transicionar de `de` a `a`?
export function puedeTransicionar(de: EstadoPedido, a: EstadoPedido): boolean {
  if (de === a) return true; // no-op
  return TRANSICIONES_VALIDAS[de]?.includes(a) ?? false;
}

// ¿Se puede editar el pedido (items, cliente, etc.)?
export function esEditable(estado: EstadoPedido): boolean {
  return !esTerminal(estado);
}

// ¿Se puede eliminar el pedido?
export function esEliminable(estado: EstadoPedido): boolean {
  // entregado: no eliminable. cancelado: eliminable. resto: eliminable.
  return estado !== 'entregado';
}

// Labels legibles en español para la UI
export const ESTADO_LABELS: Record<EstadoPedido, string> = {
  creado: 'Creado',
  pagado: 'Pagado',
  programado: 'Programado',
  entregando: 'Entregando',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'creado',
  'pagado',
  'programado',
  'entregando',
  'entregado',
  'cancelado',
];
