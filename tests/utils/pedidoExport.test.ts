import { describe, it, expect, vi } from 'vitest';
import {
  detalleItem,
  exportarPedidosExcel,
  nombreArchivoPedidos,
  pedidosAFilas,
} from '../../src/utils/pedidoExport';
import { FILTROS_VACIOS } from '../../src/utils/pedidoFiltros';
import type { FiltrosPedido } from '../../src/utils/pedidoFiltros';
import type { Pedido, PedidoItem } from '../../src/types';

const toFile = vi.fn().mockResolvedValue(undefined);
vi.mock('write-excel-file/browser', () => ({
  default: vi.fn(() => ({ toFile, toBlob: vi.fn() })),
}));
import writeXlsxFile from 'write-excel-file/browser';

function pedido(partial: Partial<Pedido> & { id: string }): Pedido {
  return {
    fecha: '2026-09-30',
    clienteId: 'c1',
    clienteNombre: 'Ana',
    clienteDireccion: 'Los Aromos 123',
    clienteContacto: '+56 9 1234 5678',
    registradoPor: 'sistema',
    items: [],
    total: 8100,
    estado: 'creado',
    tipoEntrega: 'delivery',
    deliveryCost: 1300,
    metodoPago: 'tarjeta',
    estadoPago: 'pendiente',
    ...partial,
  };
}

const item = (partial: Partial<PedidoItem> & { nombre: string }): PedidoItem => ({
  productoId: 'p1',
  precio: 5000,
  cantidad: 1,
  rol: 'fondo',
  ...partial,
});

describe('utils/pedidoExport', () => {
  describe('detalleItem', () => {
    it('cantidad × nombre', () => {
      expect(detalleItem(item({ nombre: 'Pollo', cantidad: 2 }))).toBe('2× Pollo');
    });
    it('incluye agregado, ensalada y notas con el formato del tablero', () => {
      const it2 = item({
        nombre: 'Menú',
        cantidad: 1,
        agregado: 'papas fritas',
        ensalada: 'mixta',
        notas: 'sin mayo',
      });
      expect(detalleItem(it2)).toBe('1× Menú · agregado: papas fritas · ensalada: mixta · sin mayo');
    });
  });

  describe('pedidosAFilas', () => {
    it('mapea campos con labels en español', () => {
      const [fila] = pedidosAFilas([
        pedido({
          id: '1',
          items: [item({ nombre: 'Pollo', cantidad: 2 }), item({ nombre: 'Bebida' })],
          estado: 'finalizado',
          tipoEntrega: 'retiro',
          deliveryCost: 0,
          metodoPago: 'transferencia',
          estadoPago: 'pagado',
        }),
      ]);
      expect(fila.cliente).toBe('Ana');
      expect(fila.direccion).toBe('Los Aromos 123');
      expect(fila.detalle).toBe('2× Pollo, 1× Bebida');
      expect(fila.entrega).toBe('Retiro');
      expect(fila.metodoPago).toBe('Transferencia');
      expect(fila.pago).toBe('Pagado');
      expect(fila.estado).toBe('Finalizado');
      expect(fila.delivery).toBe(0);
      expect(fila.total).toBe(8100);
    });

    it('fecha queda como Date a medianoche local (no UTC)', () => {
      const [fila] = pedidosAFilas([pedido({ id: '1', fecha: '2026-09-30' })]);
      expect(fila.fecha).toBeInstanceOf(Date);
      // Medianoche local: el día de la celda debe ser el del pedido
      expect(fila.fecha.getDate()).toBe(30);
      expect(fila.fecha.getHours()).toBe(0);
    });

    it('cliente sin nombre exporta cadena vacía', () => {
      const [fila] = pedidosAFilas([pedido({ id: '1', clienteNombre: null })]);
      expect(fila.cliente).toBe('');
    });
  });

  describe('nombreArchivoPedidos', () => {
    it('un solo día → pedidos-FECHA.xlsx', () => {
      const f: FiltrosPedido = {
        ...FILTROS_VACIOS,
        fechaDesde: '2026-09-30',
        fechaHasta: '2026-09-30',
      };
      expect(nombreArchivoPedidos(f)).toBe('pedidos-2026-09-30.xlsx');
    });
    it('rango → pedidos-DESDE_a_HASTA.xlsx', () => {
      const f: FiltrosPedido = {
        ...FILTROS_VACIOS,
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
      };
      expect(nombreArchivoPedidos(f)).toBe('pedidos-2026-09-01_a_2026-09-30.xlsx');
    });
    it('solo desde / solo hasta', () => {
      expect(nombreArchivoPedidos({ ...FILTROS_VACIOS, fechaDesde: '2026-09-15' })).toBe(
        'pedidos-desde_2026-09-15.xlsx',
      );
      expect(nombreArchivoPedidos({ ...FILTROS_VACIOS, fechaHasta: '2026-09-15' })).toBe(
        'pedidos-hasta_2026-09-15.xlsx',
      );
    });
    it('sin fecha → pedidos.xlsx', () => {
      expect(nombreArchivoPedidos(FILTROS_VACIOS)).toBe('pedidos.xlsx');
    });
  });

  describe('exportarPedidosExcel', () => {
    it('invoca write-excel-file con las filas y descarga con el nombre según filtros', async () => {
      const filtros: FiltrosPedido = {
        ...FILTROS_VACIOS,
        fechaDesde: '2026-09-30',
        fechaHasta: '2026-09-30',
      };
      await exportarPedidosExcel([pedido({ id: '1' }), pedido({ id: '2' })], filtros);
      expect(writeXlsxFile).toHaveBeenCalledOnce();
      const [filas, opts] = vi.mocked(writeXlsxFile).mock.calls[0] as [
        unknown[],
        { sheet?: string; columns?: unknown[] },
      ];
      expect(filas).toHaveLength(2);
      expect(opts.sheet).toBe('Pedidos');
      expect(opts.columns?.length).toBeGreaterThan(0);
      expect(toFile).toHaveBeenCalledWith('pedidos-2026-09-30.xlsx');
    });
  });
});
