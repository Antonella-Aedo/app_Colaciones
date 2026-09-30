import { useCallback, useEffect, useState } from 'react';
import {
  getPlatos,
  createPlato as apiCreate,
  updatePlato as apiUpdate,
  deletePlato as apiDelete,
  setPlatoActiva as apiSetActiva,
} from '../api/platos';
import type { Plato, PlatoInput } from '../types';

export function usePlatos() {
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlatos();
      setPlatos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar platos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // fetch-on-mount: refetch is async; setState runs after await, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const create = useCallback(async (input: PlatoInput) => {
    const nuevo = await apiCreate(input);
    setPlatos((prev) => [nuevo, ...prev]);
    return nuevo;
  }, []);

  const update = useCallback(async (id: string, input: PlatoInput) => {
    const actualizado = await apiUpdate(id, input);
    setPlatos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setPlatos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Toggle "disponible hoy": varios platos pueden estar activos a la vez.
  const setActiva = useCallback(async (id: string, activa: boolean) => {
    await apiSetActiva(id, activa);
    setPlatos((prev) => prev.map((p) => (p.id === id ? { ...p, activa } : p)));
  }, []);

  return { platos, loading, error, refetch, create, update, remove, setActiva };
}
