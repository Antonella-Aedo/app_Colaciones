import { useCallback, useEffect, useState } from 'react';
import {
  getColaciones,
  createColacion as apiCreate,
  updateColacion as apiUpdate,
  deleteColacion as apiDelete,
  activarColacion as apiActivar,
} from '../api/colaciones';
import type { Colacion, ColacionInput } from '../types';

export function useColaciones() {
  const [colaciones, setColaciones] = useState<Colacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getColaciones();
      setColaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar colaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (input: ColacionInput) => {
    const nuevo = await apiCreate(input);
    setColaciones((prev) => [nuevo, ...prev]);
    return nuevo;
  }, []);

  const update = useCallback(async (id: string, input: ColacionInput) => {
    const actualizado = await apiUpdate(id, input);
    setColaciones((prev) => prev.map((c) => (c.id === id ? actualizado : c)));
    return actualizado;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setColaciones((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const activar = useCallback(async (id: string) => {
    await apiActivar(id);
    setColaciones((prev) => prev.map((c) => ({ ...c, activa: c.id === id })));
  }, []);

  return { colaciones, loading, error, refetch, create, update, remove, activar };
}
