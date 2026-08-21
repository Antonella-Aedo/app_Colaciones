import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, store } from '../helpers/mockFirestore';
import { getPedidos, getPedido, createPedido, updatePedido } from '../../src/api/pedidos';
import type { PedidoInput } from '../../src/types';

const pedidoInput: PedidoInput = {
  fecha: '2026-08-20',
  cliente: 'Juan',
  registradoPor: 'Ana',
  colacionId: null,
  items: [
    { productoId: '1', nombre: 'Sándwich', precio: 1500, cantidad: 2, rol: 'fondo' },
  ],
  total: 3000,
};

beforeEach(() => {
  resetStore();
});

describe('api/pedidos (Firestore)', () => {
  it('createPedido agrega con estado pendiente y devuelve con id', async () => {
    const creado = await createPedido(pedidoInput);
    expect(creado.id).toBeTruthy();
    expect(creado.estado).toBe('pendiente');
    expect(creado.cliente).toBe('Juan');
  });

  it('getPedidos devuelve la lista', async () => {
    await createPedido(pedidoInput);
    const lista = await getPedidos();
    expect(lista).toHaveLength(1);
    expect(lista[0].cliente).toBe('Juan');
    expect(lista[0].estado).toBe('pendiente');
  });

  it('updatePedido preserva el estado existente cuando no se provee en el input', async () => {
    // Arrange: crear un pedido y forzar estado='entregado' directamente en el store
    const creado = await createPedido(pedidoInput);
    const colPedidos = store.get('pedidos')!;
    colPedidos.set(creado.id, { ...colPedidos.get(creado.id)!, estado: 'entregado' });

    // Act: actualizar solo el cliente, sin proveer estado
    const actualizado = await updatePedido(creado.id, { ...pedidoInput, cliente: 'Pedro' });

    // Assert: el estado se mantiene en 'entregado', no se reinicia a 'pendiente'
    expect(actualizado.estado).toBe('entregado');
    expect(actualizado.cliente).toBe('Pedro');

    // Verificar también que el documento persistido conserva el estado
    const persistido = await getPedido(creado.id);
    expect(persistido?.estado).toBe('entregado');
  });

  it('updatePedido permite cambiar el estado cuando se provee explícitamente', async () => {
    // Arrange: crear un pedido con estado='pendiente' (default de createPedido)
    const creado = await createPedido(pedidoInput);
    expect(creado.estado).toBe('pendiente');

    // Act: actualizar proveyendo estado='cancelado' explícitamente
    const actualizado = await updatePedido(creado.id, { ...pedidoInput, estado: 'cancelado' });

    // Assert: el estado cambia a 'cancelado'
    expect(actualizado.estado).toBe('cancelado');

    // Verificar también que el documento persistido refleja el nuevo estado
    const persistido = await getPedido(creado.id);
    expect(persistido?.estado).toBe('cancelado');
  });
});

describe('api/pedidos (validación runtime)', () => {
  it('createPedido rechaza estado fuera del enum', async () => {
    const invalido = { ...pedidoInput, estado: 'invalido' as never };
    await expect(createPedido(invalido)).rejects.toThrow();
  });

  it('createPedido rechaza total negativo', async () => {
    const invalido = { ...pedidoInput, total: -500 };
    await expect(createPedido(invalido)).rejects.toThrow();
  });

  it('createPedido rechaza items vacío', async () => {
    const invalido = { ...pedidoInput, items: [] };
    await expect(createPedido(invalido)).rejects.toThrow();
  });

  it('updatePedido rechaza estado fuera del enum', async () => {
    const creado = await createPedido(pedidoInput);
    const invalido = { ...pedidoInput, estado: 'foo' as never };
    await expect(updatePedido(creado.id, invalido)).rejects.toThrow();
  });
});
