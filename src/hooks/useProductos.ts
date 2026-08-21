import { useCallback, useEffect, useState } from 'react';
import {
  getProductos,
  createProducto as apiCreate,
  updateProducto as apiUpdate,
  deleteProducto as apiDelete,
} from '../api/productos';
import type { Producto, ProductoInput } from '../types';

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (input: ProductoInput) => {
    const nuevo = await apiCreate(input);
    setProductos((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const update = useCallback(async (id: string, input: ProductoInput) => {
    const actualizado = await apiUpdate(id, input);
    setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setProductos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { productos, loading, error, refetch, create, update, remove };
}
