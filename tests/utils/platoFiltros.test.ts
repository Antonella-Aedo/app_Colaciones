import { describe, it, expect } from 'vitest';
import { filtrarPlatos } from '../../src/utils/platoFiltros';
import type { Plato } from '../../src/types';

const base: Plato = {
  id: 'x',
  nombre: 'X',
  tipo: 'menu',
  activa: false,
  creadoPor: 'a',
  items: [{ productoId: 'p', rol: 'fondo', orden: 1 }],
};

const platos: Plato[] = [
  { ...base, id: '1', nombre: 'Cazuela de osobuco', tipo: 'menu', fecha: '2026-09-29' },
  { ...base, id: '2', nombre: 'Colación clásica', tipo: 'colacion', valor: 6500 },
  { ...base, id: '3', nombre: 'Colación vegetariana', tipo: 'colacion', valor: 6000 },
  { ...base, id: '4', nombre: 'Tallarines al pesto', tipo: 'menu', fecha: '2026-09-30' },
];

describe('filtrarPlatos', () => {
  it('sin filtros devuelve todo', () => {
    expect(filtrarPlatos(platos, {})).toHaveLength(4);
  });

  it('filtra por tipo menu / colacion', () => {
    const menus = filtrarPlatos(platos, { tipo: 'menu' });
    expect(menus).toHaveLength(2);
    expect(menus.every((p) => p.tipo === 'menu')).toBe(true);

    const colaciones = filtrarPlatos(platos, { tipo: 'colacion' });
    expect(colaciones.map((p) => p.id)).toEqual(['2', '3']);
  });

  it('filtra por nombre (substring, case-insensitive)', () => {
    expect(filtrarPlatos(platos, { busqueda: 'cazuela' })).toHaveLength(1);
    expect(filtrarPlatos(platos, { busqueda: 'COLACIÓN' })).toHaveLength(2);
    expect(filtrarPlatos(platos, { busqueda: '  pesto  ' })).toHaveLength(1);
    expect(filtrarPlatos(platos, { busqueda: 'nada' })).toHaveLength(0);
  });

  it('combina tipo + búsqueda', () => {
    const r = filtrarPlatos(platos, { tipo: 'colacion', busqueda: 'vegetariana' });
    expect(r.map((p) => p.id)).toEqual(['3']);
  });
});
