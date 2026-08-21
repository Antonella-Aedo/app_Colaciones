import { useCallback, useEffect, useState } from 'react';
import { getPedidos, createPedido as apiCreate } from '../api/pedidos';
import type { Pedido, PedidoInput } from '../types';

export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPedidos();
      setPedidos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // fetch-on-mount: refetch is async; setState runs after await, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const create = useCallback(async (input: PedidoInput) => {
    const nuevo = await apiCreate(input);
    setPedidos((prev) => [nuevo, ...prev]);
    return nuevo;
  }, []);

  return { pedidos, loading, error, refetch, create };
}
