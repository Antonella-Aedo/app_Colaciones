// Helpers de presentación para pedidos — formato de moneda y fecha/hora.
// Compartidos por PedidoTablero y PedidoTabla.

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
