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
    it('tiene los 4 estados', () => {
      expect(ESTADOS_PEDIDO).toHaveLength(4);
      expect(ESTADOS_PEDIDO).toContain('creado');
      expect(ESTADOS_PEDIDO).toContain('pagado');
      expect(ESTADOS_PEDIDO).toContain('finalizado');
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
    it('finalizado es terminal', () => {
      expect(esTerminal('finalizado')).toBe(true);
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
    it('creado → finalizado es inválido (salta pasos)', () => {
      expect(puedeTransicionar('creado', 'finalizado')).toBe(false);
    });
    it('pagado → finalizado es válido', () => {
      expect(puedeTransicionar('pagado', 'finalizado')).toBe(true);
    });
    it('pagado → cancelado es válido', () => {
      expect(puedeTransicionar('pagado', 'cancelado')).toBe(true);
    });
    it('finalizado → cualquier cosa es inválido (terminal)', () => {
      const estados: EstadoPedido[] = ['creado', 'pagado', 'cancelado'];
      for (const e of estados) {
        expect(puedeTransicionar('finalizado', e)).toBe(false);
      }
    });
    it('cancelado → cualquier cosa es inválido (terminal)', () => {
      const estados: EstadoPedido[] = ['creado', 'pagado', 'finalizado'];
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
    it('finalizado NO es editable', () => {
      expect(esEditable('finalizado')).toBe(false);
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
    it('finalizado NO es eliminable', () => {
      expect(esEliminable('finalizado')).toBe(false);
    });
  });

  describe('TRANSICIONES_VALIDAS (consistencia)', () => {
    it('finalizado no tiene transiciones salientes', () => {
      expect(TRANSICIONES_VALIDAS.finalizado).toEqual([]);
    });
    it('cancelado no tiene transiciones salientes', () => {
      expect(TRANSICIONES_VALIDAS.cancelado).toEqual([]);
    });
  });
});
