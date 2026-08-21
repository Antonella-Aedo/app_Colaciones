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

import { deletePedido } from '../../src/api/pedidos';

describe('api/pedidos (getPedido y deletePedido)', () => {
  it('getPedido retorna un pedido por id', async () => {
    // Arrange: crear un pedido
    const creado = await createPedido(pedidoInput);

    // Act: obtener el pedido por id
    const pedido = await getPedido(creado.id);

    // Assert: retorna el pedido con los datos correctos
    expect(pedido).not.toBeNull();
    expect(pedido!.id).toBe(creado.id);
    expect(pedido!.cliente).toBe('Juan');
    expect(pedido!.fecha).toBe('2026-08-20');
    expect(pedido!.items).toHaveLength(1);
    expect(pedido!.items[0].productoId).toBe('1');
    expect(pedido!.total).toBe(3000);
    expect(pedido!.estado).toBe('pendiente');
    expect(pedido!.registradoPor).toBe('Ana');
  });

  it('getPedido retorna null para id inexistente', async () => {
    const pedido = await getPedido('no-existe-123');
    expect(pedido).toBeNull();
  });

  it('deletePedido elimina un pedido', async () => {
    // Arrange: crear un pedido
    const creado = await createPedido(pedidoInput);

    // Act: eliminar el pedido
    const resultado = await deletePedido(creado.id);

    // Assert: deletePedido retorna { id }
    expect(resultado).toEqual({ id: creado.id });

    // Assert: el pedido ya no existe
    const pedido = await getPedido(creado.id);
    expect(pedido).toBeNull();
  });

  it('getPedidos retorna lista vacía cuando no hay pedidos', async () => {
    // beforeEach ya llama a resetStore, el store está limpio
    const lista = await getPedidos();
    expect(lista).toEqual([]);
  });

  it('getPedidos retorna múltiples pedidos', async () => {
    // Arrange: crear 3 pedidos
    await createPedido(pedidoInput);
    await createPedido({ ...pedidoInput, cliente: 'Pedro' });
    await createPedido({ ...pedidoInput, cliente: 'Maria' });

    // Act: obtener la lista
    const lista = await getPedidos();

    // Assert: retorna un arreglo de longitud 3
    expect(lista).toHaveLength(3);
  });
});
