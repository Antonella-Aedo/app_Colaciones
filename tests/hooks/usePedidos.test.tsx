import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { resetStore } from '../helpers/mockFirestore';
import { usePedidos } from '../../src/hooks/usePedidos';
import { createPedido } from '../../src/api/pedidos';
import type { PedidoInput } from '../../src/types';

// Mock useAuth para que user?.email esté disponible
vi.mock('../../src/firebase/auth', () => ({
  useAuth: () => ({ user: { email: 'test@test.com' }, loading: false, loginWithGoogle: vi.fn(), logout: vi.fn(), authError: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const pedidoInput: PedidoInput = {
  fecha: '2025-01-01',
  clienteId: 'cli-1',
  clienteNombre: 'Juan Pérez',
  clienteDireccion: 'Padre Hurtado 123',
  clienteContacto: '+56912345678',
  registradoPor: 'admin',
  colacionId: null,
  items: [
    { productoId: 'p1', nombre: 'Sándwich', precio: 1500, cantidad: 2, rol: 'fondo' },
  ],
  total: 3000,
  tipoEntrega: 'retiro',
  deliveryCost: 0,
  metodoPago: 'efectivo',
  estadoPago: 'pendiente',
};

beforeEach(() => {
  resetStore();
});

describe('usePedidos', () => {
  it('carga pedidos al montar', async () => {
    await createPedido(pedidoInput);
    const { result } = renderHook(() => usePedidos());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].clienteId).toBe('cli-1');
    expect(result.current.error).toBeNull();
  });

  it('create agrega un pedido a la lista', async () => {
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create(pedidoInput);
    });
    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].clienteId).toBe('cli-1');
    expect(result.current.pedidos[0].estado).toBe('creado');
  });

  it('changeEstado cambia el estado con auditoría', async () => {
    const { result } = renderHook(() => usePedidos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let creado: { id: string };
    await act(async () => {
      creado = await result.current.create(pedidoInput);
    });
    await act(async () => {
      await result.current.changeEstado(creado!.id, 'pagado');
    });
    expect(result.current.pedidos[0].estado).toBe('pagado');
    expect(result.current.pedidos[0].estadoActualizadoPor).toBe('test@test.com');
  });
});
