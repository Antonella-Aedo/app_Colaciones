import { describe, it, expect } from 'vitest';
import {
  TRANSICIONES_VALIDAS,
  esTerminal,
  puedeTransicionar,
  esEditable,
  esEliminable,
  ESTADO_LABELS,
  ESTADOS_PEDIDO,
} from '../../src/utils/pedidoEstado';
import type { EstadoPedido } from '../../src/types';

describe('utils/pedidoEstado', () => {
  describe('ESTADOS_PEDIDO', () => {
    it('tiene los 6 estados', () => {
      expect(ESTADOS_PEDIDO).toHaveLength(6);
      expect(ESTADOS_PEDIDO).toContain('creado');
      expect(ESTADOS_PEDIDO).toContain('pagado');
      expect(ESTADOS_PEDIDO).toContain('programado');
      expect(ESTADOS_PEDIDO).toContain('entregando');
      expect(ESTADOS_PEDIDO).toContain('entregado');
      expect(ESTADOS_PEDIDO).toContain('cancelado');
    });
  });

  describe('ESTADO_LABELS', () => {
    it('tiene label para cada estado', () => {
      for (const estado of ESTADOS_PEDIDO) {
        expect(ESTADO_LABELS[estado]).toBeTruthy();
      }
    });
  });

  describe('esTerminal', () => {
    it('entregado es terminal', () => {
      expect(esTerminal('entregado')).toBe(true);
    });
    it('cancelado es terminal', () => {
      expect(esTerminal('cancelado')).toBe(true);
    });
    it('creado no es terminal', () => {
      expect(esTerminal('creado')).toBe(false);
    });
    it('pagado no es terminal', () => {
      expect(esTerminal('pagado')).toBe(false);
    });
  });

  describe('puedeTransicionar', () => {
    it('creado → pagado es válido', () => {
      expect(puedeTransicionar('creado', 'pagado')).toBe(true);
    });
    it('creado → cancelado es válido', () => {
      expect(puedeTransicionar('creado', 'cancelado')).toBe(true);
    });
    it('creado → entregado es inválido (salta pasos)', () => {
      expect(puedeTransicionar('creado', 'entregado')).toBe(false);
    });
    it('pagado → programado es válido', () => {
      expect(puedeTransicionar('pagado', 'programado')).toBe(true);
    });
    it('programado → entregando es válido', () => {
      expect(puedeTransicionar('programado', 'entregando')).toBe(true);
    });
    it('entregando → entregado es válido', () => {
      expect(puedeTransicionar('entregando', 'entregado')).toBe(true);
    });
    it('entregando → programado es válido (rebote)', () => {
      expect(puedeTransicionar('entregando', 'programado')).toBe(true);
    });
    it('entregado → cualquier cosa es inválido (terminal)', () => {
      const estados: EstadoPedido[] = ['creado', 'pagado', 'programado', 'entregando', 'cancelado'];
      for (const e of estados) {
        expect(puedeTransicionar('entregado', e)).toBe(false);
      }
    });
    it('cancelado → cualquier cosa es inválido (terminal)', () => {
      const estados: EstadoPedido[] = ['creado', 'pagado', 'programado', 'entregando', 'entregado'];
      for (const e of estados) {
        expect(puedeTransicionar('cancelado', e)).toBe(false);
      }
    });
    it('mismo estado → true (no-op)', () => {
      expect(puedeTransicionar('creado', 'creado')).toBe(true);
    });
  });

  describe('esEditable', () => {
    it('creado es editable', () => {
      expect(esEditable('creado')).toBe(true);
    });
    it('pagado es editable', () => {
      expect(esEditable('pagado')).toBe(true);
    });
    it('entregado NO es editable', () => {
      expect(esEditable('entregado')).toBe(false);
    });
    it('cancelado NO es editable', () => {
      expect(esEditable('cancelado')).toBe(false);
    });
  });

  describe('esEliminable', () => {
    it('creado es eliminable', () => {
      expect(esEliminable('creado')).toBe(true);
    });
    it('cancelado es eliminable', () => {
      expect(esEliminable('cancelado')).toBe(true);
    });
    it('entregado NO es eliminable', () => {
      expect(esEliminable('entregado')).toBe(false);
    });
  });

  describe('TRANSICIONES_VALIDAS (consistencia)', () => {
    it('entregado no tiene transiciones salientes', () => {
      expect(TRANSICIONES_VALIDAS.entregado).toEqual([]);
    });
    it('cancelado no tiene transiciones salientes', () => {
      expect(TRANSICIONES_VALIDAS.cancelado).toEqual([]);
    });
  });
});
