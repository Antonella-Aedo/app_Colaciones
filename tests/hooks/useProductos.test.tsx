import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { resetStore } from '../helpers/mockFirestore';
import { useProductos } from '../../src/hooks/useProductos';
import { createProducto } from '../../src/api/productos';
import type { ProductoInput } from '../../src/types';

const productoInput: ProductoInput = {
  nombre: 'Sándwich',
  descripcion: '',
  precio: 1500,
  categoria: 'fondo',
  disponible: true,
};

beforeEach(() => {
  resetStore();
});

describe('useProductos', () => {
  it('carga productos al montar', async () => {
    // pre-poblar
    await createProducto(productoInput);

    const { result } = renderHook(() => useProductos());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.productos).toHaveLength(1);
    expect(result.current.productos[0].nombre).toBe('Sándwich');
    expect(result.current.error).toBeNull();
  });

  it('empieza vacío sin datos', async () => {
    const { result } = renderHook(() => useProductos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.productos).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
