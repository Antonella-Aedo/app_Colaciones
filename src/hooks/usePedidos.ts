import { useCallback, useEffect, useState } from 'react';
import {
  getPedidos,
  createPedido as apiCreate,
  updatePedido as apiUpdate,
  deletePedido as apiDelete,
} from '../api/pedidos';
import type { EstadoPedido, Pedido, PedidoInput } from '../types';

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

  const update = useCallback(async (id: string, input: PedidoInput) => {
    const actualizado = await apiUpdate(id, input);
    setPedidos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Cambia solo el estado: reconstruye el PedidoInput desde el pedido en cache
  // (updatePedido requiere todos los campos; estado es opcional en el schema).
  const changeEstado = useCallback(
    async (id: string, estado: EstadoPedido) => {
      const pedido = pedidos.find((p) => p.id === id);
      if (!pedido) return;
      const input: PedidoInput = {
        fecha: pedido.fecha,
        cliente: pedido.cliente,
        registradoPor: pedido.registradoPor,
        colacionId: pedido.colacionId,
        items: pedido.items,
        total: pedido.total,
        estado,
      };
      const actualizado = await apiUpdate(id, input);
      setPedidos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      return actualizado;
    },
    [pedidos],
  );

  return { pedidos, loading, error, refetch, create, update, remove, changeEstado };
}
