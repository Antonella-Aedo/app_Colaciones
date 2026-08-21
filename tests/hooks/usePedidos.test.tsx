import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { resetStore } from '../helpers/mockFirestore';
import { usePedidos } from '../../src/hooks/usePedidos';
import { createPedido } from '../../src/api/pedidos';
import type { PedidoInput } from '../../src/types';

const pedidoInput: PedidoInput = {
  fecha: '2025-01-01',
  cliente: 'Juan Pérez',
  registradoPor: 'admin',
  colacionId: null,
  items: [
    { productoId: 'p1', nombre: 'Sándwich', precio: 1500, cantidad: 2, rol: 'fondo' },
  ],
  total: 3000,
};

beforeEach(() => {
  resetStore();
});

describe('usePedidos', () => {
  it('carga pedidos al montar', async () => {
    // pre-poblar
    await createPedido(pedidoInput);

    const { result } = renderHook(() => usePedidos());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].cliente).toBe('Juan Pérez');
    expect(result.current.error).toBeNull();
  });

  it('create agrega un pedido a la lista', async () => {
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create(pedidoInput);
    });

    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].cliente).toBe('Juan Pérez');
    expect(result.current.pedidos[0].estado).toBe('pendiente');
  });
});
