import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../helpers/mockFirestore';
import { getPedidos, createPedido } from '../../src/api/pedidos';
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
});
