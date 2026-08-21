import { useCallback, useEffect, useState } from 'react';
import {
  getPedidos,
  createPedido as apiCreate,
  updatePedido as apiUpdate,
  deletePedido as apiDelete,
  cambiarEstadoPedido as apiCambiarEstado,
  confirmarPago as apiConfirmarPago,
  verificarDireccionDuplicada as apiVerificarDir,
} from '../api/pedidos';
import type { EstadoPedido, Pedido, PedidoInput } from '../types';
import { useAuth } from '../firebase/auth';

export function usePedidos() {
  const { user } = useAuth();
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

  // Cambia el estado con auditoría (registra quién/cuándo)
  const changeEstado = useCallback(
    async (id: string, estado: EstadoPedido) => {
      const email = user?.email ?? 'sistema';
      const actualizado = await apiCambiarEstado(id, estado, email);
      setPedidos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      return actualizado;
    },
    [user],
  );

  // Confirma el pago de un pedido (métodos diferidos)
  const confirmarPago = useCallback(
    async (id: string) => {
      const email = user?.email ?? 'sistema';
      const actualizado = await apiConfirmarPago(id, email);
      setPedidos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      return actualizado;
    },
    [user],
  );

  // Verifica si hay otro pedido con la misma dirección esa fecha (informativo)
  const verificarDireccion = useCallback(
    async (direccion: string, fecha: string, excludeId?: string) => {
      return apiVerificarDir(direccion, fecha, excludeId);
    },
    [],
  );

  return {
    pedidos,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    changeEstado,
    confirmarPago,
    verificarDireccion,
  };
}
