// Helpers de presentación para pedidos — formato de moneda, fecha/hora
// y labels legibles. Compartidos por PedidoTablero, PedidoTabla y el
// export a Excel.
import type { EstadoPago, MetodoPago, TipoEntrega } from '../types';

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

export const ENTREGA_LABELS: Record<TipoEntrega, string> = {
  delivery: 'Delivery',
  retiro: 'Retiro',
};

export const PAGO_LABELS: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
};

export function formatFechaHora(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatFecha(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

export function pesos(monto: number): string {
  return `$${monto.toLocaleString('es-CL')}`;
}
