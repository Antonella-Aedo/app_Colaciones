import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../helpers/mockFirestore';
import {
  createPedido,
  updatePedido,
  deletePedido,
  cambiarEstadoPedido,
  confirmarPago,
} from '../../src/api/pedidos';
import type { PedidoInput } from '../../src/types';

const pedidoInput: PedidoInput = {
  fecha: '2026-08-20',
  clienteId: 'cli-1',
  clienteNombre: 'Juan',
  clienteDireccion: 'Padre Hurtado 123',
  clienteContacto: '+56912345678',
  registradoPor: 'Ana',
  colacionId: null,
  items: [
    { productoId: '1', nombre: 'Sándwich', precio: 1500, cantidad: 2, rol: 'fondo' },
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

// === Regresión: indexOf error ===
// El error "Cannot read properties of undefined (reading 'indexOf')" ocurría
// en el SDK de Firestore (ResourcePath.fromString) cuando se pasaba un id
// undefined/empty a doc(db, COL, id). Las funciones de API ahora validan
// el id antes de tocar Firestore, lanzando un error claro en su lugar.

describe('api/pedidos (regresión: id inválido)', () => {
  it('cambiarEstadoPedido rechaza id undefined con mensaje claro', async () => {
    await expect(
      cambiarEstadoPedido(undefined as unknown as string, 'finalizado', 'ana@test.com'),
    ).rejects.toThrow('ID de pedido inválido');
  });

  it('cambiarEstadoPedido rechaza id vacío con mensaje claro', async () => {
    await expect(
      cambiarEstadoPedido('', 'finalizado', 'ana@test.com'),
    ).rejects.toThrow('ID de pedido inválido');
  });

  it('deletePedido rechaza id undefined con mensaje claro', async () => {
    await expect(
      deletePedido(undefined as unknown as string),
    ).rejects.toThrow('ID de pedido inválido');
  });

  it('deletePedido rechaza id vacío con mensaje claro', async () => {
    await expect(deletePedido('')).rejects.toThrow('ID de pedido inválido');
  });

  it('updatePedido rechaza id undefined con mensaje claro', async () => {
    await expect(
      updatePedido(undefined as unknown as string, pedidoInput),
    ).rejects.toThrow('ID de pedido inválido');
  });

  it('updatePedido rechaza id vacío con mensaje claro', async () => {
    await expect(updatePedido('', pedidoInput)).rejects.toThrow('ID de pedido inválido');
  });

  it('confirmarPago rechaza id undefined con mensaje claro', async () => {
    await expect(
      confirmarPago(undefined as unknown as string, 'ana@test.com'),
    ).rejects.toThrow('ID de pedido inválido');
  });
});

// === Regresión: flujo pagado → finalizado ===
// El usuario reportó que cambiar de 'pagado' a 'finalizado' fallaba.
// Este test verifica que la transición funciona correctamente.

describe('api/pedidos (regresión: pagado → finalizado)', () => {
  it('cambiarEstadoPedido permite pagado → finalizado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    const actualizado = await cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com');
    expect(actualizado.estado).toBe('finalizado');
  });

  it('cambiarEstadoPedido registra auditoría en pagado → finalizado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    await cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com');
    // Verifica que el historial tiene 2 entradas
    const { getPedido } = await import('../../src/api/pedidos');
    const persistido = await getPedido(creado.id);
    expect(persistido?.historialEstados).toHaveLength(2);
    expect(persistido?.historialEstados?.[1].estado).toBe('finalizado');
  });

  it('cambiarEstadoPedido NO sincroniza estadoPago al ir a finalizado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    const actualizado = await cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com');
    // estadoPago debe seguir como 'pagado' (se sincronizó al ir a 'pagado')
    expect(actualizado.estadoPago).toBe('pagado');
  });
});

// === Regresión: delete con error handling ===
// El usuario reportó que los botones de eliminar no funcionaban.
// El handleDelete no tenía try/catch, ahora sí. Este test verifica
// que deletePedido propaga errores correctamente.

describe('api/pedidos (regresión: delete propaga errores)', () => {
  it('deletePedido rechaza eliminación de pedido finalizado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    await cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com');
    await expect(deletePedido(creado.id)).rejects.toThrow('No se puede eliminar');
  });

  it('deletePedido permite eliminación de pedido cancelado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'cancelado', 'ana@test.com');
    const result = await deletePedido(creado.id);
    expect(result).toEqual({ id: creado.id });
  });

  it('deletePedido permite eliminación de pedido en estado creado', async () => {
    const creado = await createPedido(pedidoInput);
    const result = await deletePedido(creado.id);
    expect(result).toEqual({ id: creado.id });
  });

  it('deletePedido permite eliminación de pedido en estado pagado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    const result = await deletePedido(creado.id);
    expect(result).toEqual({ id: creado.id });
  });
});
