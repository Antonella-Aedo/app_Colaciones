// Filtros de pedidos — función pura + tipo de filtros.
// Sigue el patrón de utils/pedidoEstado.ts: dominio puro, testeable, sin React.
import type { EstadoPago, EstadoPedido, Pedido, TipoEntrega } from '../types';

export interface FiltrosPedido {
  fechaDesde: string | null; // ISO yyyy-MM-dd (inclusivo)
  fechaHasta: string | null; // ISO yyyy-MM-dd (inclusivo)
  estados: EstadoPedido[]; // [] = todos
  cliente: string; // texto libre, case-insensitive, sobre nombre|direccion
  tiposEntrega: TipoEntrega[]; // [] = todos
  estadosPago: EstadoPago[]; // [] = todos
}

export const FILTROS_VACIOS: FiltrosPedido = {
  fechaDesde: null,
  fechaHasta: null,
  estados: [],
  cliente: '',
  tiposEntrega: [],
  estadosPago: [],
};

export function hayFiltrosActivos(f: FiltrosPedido): boolean {
  return (
    f.fechaDesde !== null ||
    f.fechaHasta !== null ||
    f.estados.length > 0 ||
    f.cliente.trim() !== '' ||
    f.tiposEntrega.length > 0 ||
    f.estadosPago.length > 0
  );
}

function dentroDeRango(fecha: string, desde: string | null, hasta: string | null): boolean {
  // Las fechas ISO yyyy-MM-dd comparan lexicográficamente igual que cronológicamente.
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

function coincideCliente(p: Pedido, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const nombre = (p.clienteNombre ?? '').toLowerCase();
  const dir = (p.clienteDireccion ?? '').toLowerCase();
  return nombre.includes(q) || dir.includes(q);
}

export function filtrarPedidos(pedidos: Pedido[], filtros: FiltrosPedido): Pedido[] {
  const { fechaDesde, fechaHasta, estados, cliente, tiposEntrega, estadosPago } = filtros;
  return pedidos.filter((p) => {
    if (!dentroDeRango(p.fecha, fechaDesde, fechaHasta)) return false;
    if (estados.length > 0 && !estados.includes(p.estado)) return false;
    if (!coincideCliente(p, cliente)) return false;
    if (tiposEntrega.length > 0 && !tiposEntrega.includes(p.tipoEntrega)) return false;
    if (estadosPago.length > 0 && !estadosPago.includes(p.estadoPago)) return false;
    return true;
  });
}
