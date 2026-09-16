import { describe, it, expect } from 'vitest';
import { filtrarPedidos, FILTROS_VACIOS, hayFiltrosActivos } from '../../src/utils/pedidoFiltros';
import type { Pedido } from '../../src/types';
import type { FiltrosPedido } from '../../src/utils/pedidoFiltros';

function pedido(partial: Partial<Pedido> & { id: string }): Pedido {
  return {
    fecha: '2026-08-26',
    clienteId: 'c1',
    clienteNombre: 'Ana',
    clienteDireccion: 'Los Aromos 123',
    clienteContacto: '+56 9 1234 5678',
    registradoPor: 'sistema',
    items: [],
    total: 6800,
    estado: 'creado',
    tipoEntrega: 'delivery',
    deliveryCost: 1300,
    metodoPago: 'efectivo',
    estadoPago: 'pagado',
    ...partial,
  };
}

const PEDIDOS: Pedido[] = [
  pedido({ id: '1', fecha: '2026-08-25', clienteNombre: 'Ana Pérez', clienteDireccion: 'Los Aromos 123', estado: 'creado', tipoEntrega: 'delivery', estadoPago: 'pendiente', metodoPago: 'tarjeta' }),
  pedido({ id: '2', fecha: '2026-08-26', clienteNombre: 'Beatriz', clienteDireccion: 'Las Palmas 456', estado: 'pagado', tipoEntrega: 'retiro', estadoPago: 'pagado', metodoPago: 'efectivo' }),
  pedido({ id: '3', fecha: '2026-08-26', clienteNombre: 'Ana Luz', clienteDireccion: 'El Roble 789', estado: 'finalizado', tipoEntrega: 'delivery', estadoPago: 'pagado', metodoPago: 'transferencia' }),
  pedido({ id: '4', fecha: '2026-08-27', clienteNombre: 'Carlos', clienteDireccion: 'Los Aromos 123', estado: 'cancelado', tipoEntrega: 'retiro', estadoPago: 'pendiente', metodoPago: 'tarjeta' }),
];

describe('utils/pedidoFiltros', () => {
  describe('FILTROS_VACIOS', () => {
    it('no filtra nada (devuelve todos los pedidos)', () => {
      expect(filtrarPedidos(PEDIDOS, FILTROS_VACIOS)).toHaveLength(4);
    });
  });

  describe('hayFiltrosActivos', () => {
    it('false para FILTROS_VACIOS', () => {
      expect(hayFiltrosActivos(FILTROS_VACIOS)).toBe(false);
    });
    it('true si hay fechaDesde', () => {
      expect(hayFiltrosActivos({ ...FILTROS_VACIOS, fechaDesde: '2026-08-26' })).toBe(true);
    });
    it('true si hay estados seleccionados', () => {
      expect(hayFiltrosActivos({ ...FILTROS_VACIOS, estados: ['creado'] })).toBe(true);
    });
    it('true si hay texto de cliente', () => {
      expect(hayFiltrosActivos({ ...FILTROS_VACIOS, cliente: 'ana' })).toBe(true);
    });
  });

  describe('fecha (rango inclusivo)', () => {
    it('fecha exacta (desde=hasta) devuelve solo ese día', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, fechaDesde: '2026-08-26', fechaHasta: '2026-08-26' };
      const res = filtrarPedidos(PEDIDOS, f);
      expect(res.map((p) => p.id).sort()).toEqual(['2', '3']);
    });
    it('rango desde 25 hasta 26', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, fechaDesde: '2026-08-25', fechaHasta: '2026-08-26' };
      const res = filtrarPedidos(PEDIDOS, f);
      expect(res).toHaveLength(3);
    });
    it('solo fechaDesde (desde en adelante)', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, fechaDesde: '2026-08-26' };
      const res = filtrarPedidos(PEDIDOS, f);
      expect(res.map((p) => p.id).sort()).toEqual(['2', '3', '4']);
    });
    it('solo fechaHasta (hasta ese día inclusive)', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, fechaHasta: '2026-08-26' };
      const res = filtrarPedidos(PEDIDOS, f);
      expect(res.map((p) => p.id).sort()).toEqual(['1', '2', '3']);
    });
  });

  describe('estados (multi-selección)', () => {
    it('un estado', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, estados: ['creado'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id)).toEqual(['1']);
    });
    it('varios estados', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, estados: ['creado', 'pagado'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['1', '2']);
    });
    it('[] = todos', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, estados: [] };
      expect(filtrarPedidos(PEDIDOS, f)).toHaveLength(4);
    });
  });

  describe('cliente (búsqueda de texto)', () => {
    it('coincide por nombre (case-insensitive)', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, cliente: 'ANA' };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['1', '3']);
    });
    it('coincide por dirección', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, cliente: 'aromos' };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['1', '4']);
    });
    it('sin coincidencias devuelve vacío', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, cliente: 'zzz' };
      expect(filtrarPedidos(PEDIDOS, f)).toEqual([]);
    });
    it('cliente sin nombre usa la dirección', () => {
      const sinNombre = pedido({ id: '5', clienteNombre: null, clienteDireccion: 'Sin nombre 1' });
      const f: FiltrosPedido = { ...FILTROS_VACIOS, cliente: 'sin nombre' };
      expect(filtrarPedidos([sinNombre], f).map((p) => p.id)).toEqual(['5']);
    });
  });

  describe('tiposEntrega', () => {
    it('solo delivery', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, tiposEntrega: ['delivery'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['1', '3']);
    });
    it('solo retiro', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, tiposEntrega: ['retiro'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['2', '4']);
    });
  });

  describe('estadosPago', () => {
    it('solo pendiente', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, estadosPago: ['pendiente'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['1', '4']);
    });
    it('solo pagado', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, estadosPago: ['pagado'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id).sort()).toEqual(['2', '3']);
    });
  });

  describe('combinación de filtros (AND)', () => {
    it('fecha + estado + entrega', () => {
      const f: FiltrosPedido = {
        ...FILTROS_VACIOS,
        fechaDesde: '2026-08-26',
        fechaHasta: '2026-08-26',
        estados: ['pagado', 'finalizado'],
        tiposEntrega: ['delivery'],
      };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id)).toEqual(['3']);
    });
    it('cliente + estadoPago', () => {
      const f: FiltrosPedido = { ...FILTROS_VACIOS, cliente: 'ana', estadosPago: ['pendiente'] };
      expect(filtrarPedidos(PEDIDOS, f).map((p) => p.id)).toEqual(['1']);
    });
  });

  it('no muta el array de entrada', () => {
    const copia = [...PEDIDOS];
    filtrarPedidos(PEDIDOS, { ...FILTROS_VACIOS, estados: ['creado'] });
    expect(PEDIDOS).toEqual(copia);
  });
});
