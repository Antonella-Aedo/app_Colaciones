import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, store } from '../helpers/mockFirestore';
import { getPedidos, getPedido, createPedido, updatePedido, deletePedido, cambiarEstadoPedido, verificarDireccionDuplicada } from '../../src/api/pedidos';
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

describe('api/pedidos (Firestore)', () => {
  it('createPedido agrega con estado creado y devuelve con id', async () => {
    const creado = await createPedido(pedidoInput);
    expect(creado.id).toBeTruthy();
    expect(creado.estado).toBe('creado');
    expect(creado.clienteId).toBe('cli-1');
  });

  it('getPedidos devuelve la lista', async () => {
    await createPedido(pedidoInput);
    const lista = await getPedidos();
    expect(lista).toHaveLength(1);
    expect(lista[0].clienteId).toBe('cli-1');
    expect(lista[0].estado).toBe('creado');
  });

  it('updatePedido preserva el estado existente cuando no se provee en el input', async () => {
    const creado = await createPedido(pedidoInput);
    const colPedidos = store.get('pedidos')!;
    colPedidos.set(creado.id, { ...colPedidos.get(creado.id)!, estado: 'pagado' });

    const actualizado = await updatePedido(creado.id, { ...pedidoInput, clienteNombre: 'Pedro' });
    expect(actualizado.estado).toBe('pagado');
    expect(actualizado.clienteNombre).toBe('Pedro');

    const persistido = await getPedido(creado.id);
    expect(persistido?.estado).toBe('pagado');
  });

  it('updatePedido permite cambiar el estado cuando se provee explícitamente (transición válida)', async () => {
    const creado = await createPedido(pedidoInput);
    expect(creado.estado).toBe('creado');

    const actualizado = await updatePedido(creado.id, { ...pedidoInput, estado: 'pagado' });
    expect(actualizado.estado).toBe('pagado');

    const persistido = await getPedido(creado.id);
    expect(persistido?.estado).toBe('pagado');
  });

  it('updatePedido rechaza transición inválida', async () => {
    const creado = await createPedido(pedidoInput);
    // creado → finalizado no es válida (debe pasar por pagado)
    await expect(updatePedido(creado.id, { ...pedidoInput, estado: 'finalizado' })).rejects.toThrow();
  });
});

describe('api/pedidos (delivery)', () => {
  it('createPedido con delivery asigna deliveryCost=1300 y total incluye delivery', async () => {
    const input: PedidoInput = { ...pedidoInput, tipoEntrega: 'delivery' };
    const creado = await createPedido(input);
    expect(creado.deliveryCost).toBe(1300);
    expect(creado.total).toBe(3000 + 1300);
  });

  it('createPedido con retiro asigna deliveryCost=0', async () => {
    const creado = await createPedido(pedidoInput);
    expect(creado.deliveryCost).toBe(0);
    expect(creado.total).toBe(3000);
  });
});

describe('api/pedidos (verificarDireccionDuplicada)', () => {
  it('retorna vacío si no hay otros pedidos con esa dirección', async () => {
    const result = await verificarDireccionDuplicada('Padre Hurtado 123', '2026-08-20');
    expect(result).toEqual([]);
  });

  it('retorna pedidos con la misma dirección y fecha', async () => {
    await createPedido(pedidoInput);
    const result = await verificarDireccionDuplicada('Padre Hurtado 123', '2026-08-20');
    expect(result).toHaveLength(1);
  });

  it('excluye el pedido con excludeId', async () => {
    const creado = await createPedido(pedidoInput);
    const result = await verificarDireccionDuplicada('Padre Hurtado 123', '2026-08-20', creado.id);
    expect(result).toEqual([]);
  });
});

describe('api/pedidos (cambiarEstadoPedido con auditoría)', () => {
  it('cambia el estado y registra auditoría', async () => {
    const creado = await createPedido(pedidoInput);
    const actualizado = await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    expect(actualizado.estado).toBe('pagado');
    expect(actualizado.estadoActualizadoPor).toBe('ana@test.com');
    expect(actualizado.estadoActualizadoEn).toBeTruthy();

    const persistido = await getPedido(creado.id);
    expect(persistido?.historialEstados).toHaveLength(1);
    expect(persistido?.historialEstados?.[0].cambiadoPor).toBe('ana@test.com');
  });

  it('al cambiar a pagado, sincroniza estadoPago=pagado', async () => {
    const creado = await createPedido(pedidoInput);
    const actualizado = await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    expect(actualizado.estadoPago).toBe('pagado');
  });

  it('rechaza transición inválida', async () => {
    const creado = await createPedido(pedidoInput);
    await expect(cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com')).rejects.toThrow();
  });
});

describe('api/pedidos (bloqueo edición/eliminación)', () => {
  it('updatePedido rechaza edición si estado=finalizado', async () => {
    const creado = await createPedido(pedidoInput);
    // Avanzar por el flujo: creado → pagado → finalizado
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    await cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com');

    await expect(updatePedido(creado.id, { ...pedidoInput, clienteNombre: 'Pedro' })).rejects.toThrow();
  });

  it('deletePedido rechaza eliminación si estado=finalizado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'pagado', 'ana@test.com');
    await cambiarEstadoPedido(creado.id, 'finalizado', 'ana@test.com');

    await expect(deletePedido(creado.id)).rejects.toThrow();
  });

  it('deletePedido permite eliminación si estado=cancelado', async () => {
    const creado = await createPedido(pedidoInput);
    await cambiarEstadoPedido(creado.id, 'cancelado', 'ana@test.com');
    const result = await deletePedido(creado.id);
    expect(result).toEqual({ id: creado.id });
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

  it('createPedido rechaza tipoEntrega fuera del enum', async () => {
    const invalido = { ...pedidoInput, tipoEntrega: 'foo' as never };
    await expect(createPedido(invalido)).rejects.toThrow();
  });

  it('updatePedido rechaza estado fuera del enum', async () => {
    const creado = await createPedido(pedidoInput);
    const invalido = { ...pedidoInput, estado: 'foo' as never };
    await expect(updatePedido(creado.id, invalido)).rejects.toThrow();
  });
});

describe('api/pedidos (cliente no guardado)', () => {
  it('createPedido acepta clienteId vacío (cliente no persistido)', async () => {
    const input: PedidoInput = {
      ...pedidoInput,
      clienteId: '',
      clienteNombre: null,
      clienteDireccion: 'Av. Siempre Viva 742',
      clienteContacto: '+56912345678',
    };
    const creado = await createPedido(input);
    expect(creado.id).toBeTruthy();
    expect(creado.clienteId).toBe('');
    expect(creado.clienteDireccion).toBe('Av. Siempre Viva 742');

    const persistido = await getPedido(creado.id);
    expect(persistido?.clienteId).toBe('');
  });

  it('updatePedido acepta clienteId vacío', async () => {
    const creado = await createPedido({ ...pedidoInput, clienteId: '' });
    const actualizado = await updatePedido(creado.id, { ...pedidoInput, clienteId: '' });
    expect(actualizado.clienteId).toBe('');
  });
});

describe('api/pedidos (getPedido y deletePedido)', () => {
  it('getPedido retorna un pedido por id', async () => {
    const creado = await createPedido(pedidoInput);
    const pedido = await getPedido(creado.id);
    expect(pedido).not.toBeNull();
    expect(pedido!.id).toBe(creado.id);
    expect(pedido!.clienteId).toBe('cli-1');
    expect(pedido!.fecha).toBe('2026-08-20');
    expect(pedido!.items).toHaveLength(1);
    expect(pedido!.items[0].productoId).toBe('1');
    expect(pedido!.total).toBe(3000);
    expect(pedido!.estado).toBe('creado');
    expect(pedido!.registradoPor).toBe('Ana');
  });

  it('getPedido retorna null para id inexistente', async () => {
    const pedido = await getPedido('no-existe-123');
    expect(pedido).toBeNull();
  });

  it('deletePedido elimina un pedido en estado creado', async () => {
    const creado = await createPedido(pedidoInput);
    const resultado = await deletePedido(creado.id);
    expect(resultado).toEqual({ id: creado.id });
    const pedido = await getPedido(creado.id);
    expect(pedido).toBeNull();
  });

  it('getPedidos retorna lista vacía cuando no hay pedidos', async () => {
    const lista = await getPedidos();
    expect(lista).toEqual([]);
  });

  it('getPedidos retorna múltiples pedidos', async () => {
    await createPedido(pedidoInput);
    await createPedido({ ...pedidoInput, clienteId: 'cli-2', clienteNombre: 'Pedro' });
    await createPedido({ ...pedidoInput, clienteId: 'cli-3', clienteNombre: 'Maria' });
    const lista = await getPedidos();
    expect(lista).toHaveLength(3);
  });
});
