// Exportación de pedidos a Excel.
// Capa pura: pedidosAFilas (mapeo a filas planas) y nombreArchivoPedidos
// (nombre según el rango de fechas activo). El adapter exportarPedidosExcel
// genera el .xlsx con write-excel-file y dispara la descarga.
import writeXlsxFile from 'write-excel-file/browser';
import type { Column } from 'write-excel-file/browser';
import type { Pedido, PedidoItem } from '../types';
import { ESTADO_LABELS } from './pedidoEstado';
import { ENTREGA_LABELS, METODO_PAGO_LABELS, PAGO_LABELS } from './pedidoFormat';
import type { FiltrosPedido } from './pedidoFiltros';

export interface FilaPedido {
  fecha: Date;
  cliente: string;
  direccion: string;
  contacto: string;
  detalle: string;
  entrega: string;
  metodoPago: string;
  pago: string;
  estado: string;
  delivery: number;
  total: number;
}

/** Una línea de detalle: "2× Pollo · agregado: papas · sin mayo". */
export function detalleItem(it: PedidoItem): string {
  let texto = `${it.cantidad}× ${it.nombre}`;
  if (it.agregado) texto += ` · agregado: ${it.agregado}`;
  if (it.ensalada) texto += ` · ensalada: ${it.ensalada}`;
  if (it.notas) texto += ` · ${it.notas}`;
  return texto;
}

/** Mapea pedidos a filas planas para la planilla (una fila por pedido). */
export function pedidosAFilas(pedidos: Pedido[]): FilaPedido[] {
  return pedidos.map((p) => ({
    // 'T00:00:00' fuerza medianoche local — sin eso Date parsea en UTC
    // y la celda mostraría el día anterior en zonas GMT-negativas.
    fecha: new Date(`${p.fecha}T00:00:00`),
    cliente: p.clienteNombre ?? '',
    direccion: p.clienteDireccion ?? '',
    contacto: p.clienteContacto ?? '',
    detalle: p.items.map(detalleItem).join(', '),
    entrega: ENTREGA_LABELS[p.tipoEntrega],
    metodoPago: METODO_PAGO_LABELS[p.metodoPago],
    pago: PAGO_LABELS[p.estadoPago],
    estado: ESTADO_LABELS[p.estado],
    delivery: p.deliveryCost,
    total: p.total,
  }));
}

/**
 * Nombre del archivo según el rango de fechas del filtro:
 * un día → pedidos-2026-09-30.xlsx; rango → pedidos-2026-09-01_a_2026-09-30.xlsx;
 * sin fecha → pedidos.xlsx.
 */
export function nombreArchivoPedidos(filtros: FiltrosPedido): string {
  const { fechaDesde, fechaHasta } = filtros;
  if (fechaDesde && fechaHasta) {
    return fechaDesde === fechaHasta
      ? `pedidos-${fechaDesde}.xlsx`
      : `pedidos-${fechaDesde}_a_${fechaHasta}.xlsx`;
  }
  if (fechaDesde) return `pedidos-desde_${fechaDesde}.xlsx`;
  if (fechaHasta) return `pedidos-hasta_${fechaHasta}.xlsx`;
  return 'pedidos.xlsx';
}

const COLUMNAS: Column<FilaPedido>[] = [
  { header: { value: 'Fecha', fontWeight: 'bold' }, width: 12, cell: (f) => ({ value: f.fecha, format: 'dd/mm/yyyy' }) },
  { header: { value: 'Cliente', fontWeight: 'bold' }, width: 20, cell: (f) => f.cliente },
  { header: { value: 'Dirección', fontWeight: 'bold' }, width: 28, cell: (f) => f.direccion },
  { header: { value: 'Contacto', fontWeight: 'bold' }, width: 18, cell: (f) => f.contacto },
  { header: { value: 'Detalle', fontWeight: 'bold' }, width: 50, cell: (f) => f.detalle },
  { header: { value: 'Entrega', fontWeight: 'bold' }, width: 10, cell: (f) => f.entrega },
  { header: { value: 'Método de pago', fontWeight: 'bold' }, width: 15, cell: (f) => f.metodoPago },
  { header: { value: 'Pago', fontWeight: 'bold' }, width: 10, cell: (f) => f.pago },
  { header: { value: 'Estado', fontWeight: 'bold' }, width: 11, cell: (f) => f.estado },
  { header: { value: 'Delivery', fontWeight: 'bold' }, width: 10, cell: (f) => ({ value: f.delivery, format: '$ #,##0' }) },
  { header: { value: 'Total', fontWeight: 'bold' }, width: 10, cell: (f) => ({ value: f.total, format: '$ #,##0' }) },
];

/** Genera y descarga el .xlsx con los pedidos actualmente visibles. */
export async function exportarPedidosExcel(
  pedidos: Pedido[],
  filtros: FiltrosPedido,
): Promise<void> {
  const filas = pedidosAFilas(pedidos);
  await writeXlsxFile(filas, { sheet: 'Pedidos', columns: COLUMNAS }).toFile(
    nombreArchivoPedidos(filtros),
  );
}
