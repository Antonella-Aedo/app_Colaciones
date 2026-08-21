import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../helpers/mockFirestore';
import {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  findOrCreateCliente,
} from '../../src/api/clientes';
import type { ClienteInput } from '../../src/types';

const clienteInput: ClienteInput = {
  direccion: 'Padre Hurtado 123',
  contacto: '+56912345678',
  nombre: 'Juan',
};

beforeEach(() => {
  resetStore();
});

describe('api/clientes (Firestore)', () => {
  it('createCliente agrega y devuelve con id', async () => {
    const creado = await createCliente(clienteInput);
    expect(creado.id).toBeTruthy();
    expect(creado.direccion).toBe('padre hurtado 123');
    expect(creado.contacto).toBe('+56912345678');
    expect(creado.nombre).toBe('Juan');
  });

  it('getClientes devuelve la lista', async () => {
    await createCliente(clienteInput);
    const lista = await getClientes();
    expect(lista).toHaveLength(1);
    expect(lista[0].direccion).toBe('padre hurtado 123');
  });

  it('getCliente retorna un cliente por id', async () => {
    const creado = await createCliente(clienteInput);
    const cliente = await getCliente(creado.id);
    expect(cliente).not.toBeNull();
    expect(cliente!.id).toBe(creado.id);
    expect(cliente!.direccion).toBe('padre hurtado 123');
  });

  it('getCliente retorna null para id inexistente', async () => {
    const cliente = await getCliente('no-existe');
    expect(cliente).toBeNull();
  });

  it('updateCliente actualiza los datos', async () => {
    const creado = await createCliente(clienteInput);
    const actualizado = await updateCliente(creado.id, {
      direccion: 'Padre Hurtado 456',
      contacto: '+56987654321',
      nombre: 'Juan Pérez',
    });
    expect(actualizado.direccion).toBe('padre hurtado 456');
    expect(actualizado.contacto).toBe('+56987654321');
    expect(actualizado.nombre).toBe('Juan Pérez');
  });

  it('deleteCliente elimina un cliente', async () => {
    const creado = await createCliente(clienteInput);
    await deleteCliente(creado.id);
    const cliente = await getCliente(creado.id);
    expect(cliente).toBeNull();
  });

  it('createCliente acepta nombre null (opcional)', async () => {
    const creado = await createCliente({
      direccion: 'Padre Hurtado 999',
      contacto: '+56911111111',
      nombre: null,
    });
    expect(creado.nombre).toBeNull();
  });
});

describe('api/clientes (findOrCreateCliente)', () => {
  it('crea el cliente si no existe', async () => {
    const cliente = await findOrCreateCliente(clienteInput);
    expect(cliente.id).toBeTruthy();
    expect(cliente.direccion).toBe('padre hurtado 123');

    const lista = await getClientes();
    expect(lista).toHaveLength(1);
  });

  it('retorna el cliente existente si ya existe (misma direccion+contacto)', async () => {
    const primero = await findOrCreateCliente(clienteInput);
    const segundo = await findOrCreateCliente(clienteInput);
    expect(segundo.id).toBe(primero.id);

    const lista = await getClientes();
    expect(lista).toHaveLength(1); // no se duplica
  });
});

describe('api/clientes (validación runtime)', () => {
  it('createCliente rechaza direccion vacía', async () => {
    await expect(createCliente({ ...clienteInput, direccion: '' })).rejects.toThrow();
  });

  it('createCliente rechaza contacto vacío', async () => {
    await expect(createCliente({ ...clienteInput, contacto: '' })).rejects.toThrow();
  });
});
