import type { Plato, TipoPlato } from '../types';

export interface FiltroPlatos {
  /** null/undefined = todos; 'menu' | 'colacion' filtra por tipo de plato. */
  tipo?: TipoPlato | null;
  /** Texto libre: substring case-insensitive sobre el nombre del plato. */
  busqueda?: string;
}

export function filtrarPlatos(platos: Plato[], filtro: FiltroPlatos): Plato[] {
  const q = (filtro.busqueda ?? '').trim().toLowerCase();
  return platos.filter(
    (p) =>
      (!filtro.tipo || p.tipo === filtro.tipo) &&
      (!q || p.nombre.toLowerCase().includes(q)),
  );
}
