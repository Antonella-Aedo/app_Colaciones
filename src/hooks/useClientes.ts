import { useCallback, useEffect, useState } from 'react';
import {
  getClientes,
  createCliente as apiCreate,
  updateCliente as apiUpdate,
  deleteCliente as apiDelete,
  findOrCreateCliente as apiFindOrCreate,
} from '../api/clientes';
import type { Cliente, ClienteInput } from '../types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const create = useCallback(async (input: ClienteInput) => {
    const nuevo = await apiCreate(input);
    setClientes((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const update = useCallback(async (id: string, input: ClienteInput) => {
    const actualizado = await apiUpdate(id, input);
    setClientes((prev) => prev.map((c) => (c.id === id ? actualizado : c)));
    return actualizado;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setClientes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const findOrCreate = useCallback(async (input: ClienteInput) => {
    const cliente = await apiFindOrCreate(input);
    setClientes((prev) => {
      if (prev.some((c) => c.id === cliente.id)) return prev;
      return [...prev, cliente];
    });
    return cliente;
  }, []);

  return { clientes, loading, error, refetch, create, update, remove, findOrCreate };
}
