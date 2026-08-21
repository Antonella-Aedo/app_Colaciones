import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../helpers/mockFirestore';
import {
  getColaciones,
  createColacion,
  updateColacion,
  deleteColacion,
  activarColacion,
} from '../../src/api/colaciones';
import type { ColacionInput } from '../../src/types';

const colacionInput: ColacionInput = {
  nombre: 'Menú del día',
  fecha: '2026-08-20',
  activa: false,
  creadoPor: 'Ana',
  items: [
    { productoId: 'p1', rol: 'fondo', orden: 1 },
    { productoId: 'p2', rol: 'agregado', orden: 2 },
    { productoId: 'p3', rol: 'ensalada', orden: 3 },
  ],
};

beforeEach(() => {
  resetStore();
});

describe('api/colaciones (Firestore)', () => {
  it('createColacion agrega y devuelve con id', async () => {
    const creado = await createColacion(colacionInput);
    expect(creado.id).toBeTruthy();
    expect(creado.nombre).toBe('Menú del día');
    expect(creado.items).toHaveLength(3);
  });

  it('getColaciones devuelve la lista', async () => {
    await createColacion(colacionInput);
    const lista = await getColaciones();
    expect(lista).toHaveLength(1);
  });

  it('updateColacion reemplaza los datos', async () => {
    const creado = await createColacion(colacionInput);
    const actualizado = await updateColacion(creado.id, { ...colacionInput, nombre: 'Otro' });
    expect(actualizado.nombre).toBe('Otro');
  });

  it('deleteColacion elimina', async () => {
    const creado = await createColacion(colacionInput);
    await deleteColacion(creado.id);
    const lista = await getColaciones();
    expect(lista).toHaveLength(0);
  });

  it('activarColacion marca una como activa', async () => {
    const creado = await createColacion(colacionInput);
    await activarColacion(creado.id);
    const lista = await getColaciones();
    expect(lista[0].activa).toBe(true);
  });
});

describe('api/colaciones (validación runtime)', () => {
  it('createColacion rechaza items vacío', async () => {
    const invalido = { ...colacionInput, items: [] };
    await expect(createColacion(invalido)).rejects.toThrow();
  });

  it('createColacion rechaza rol de item inválido', async () => {
    const invalido = {
      ...colacionInput,
      items: [{ productoId: 'p1', rol: 'invalido' as never, orden: 1 }],
    };
    await expect(createColacion(invalido)).rejects.toThrow();
  });

  it('updateColacion rechaza items vacío', async () => {
    const creado = await createColacion(colacionInput);
    const invalido = { ...colacionInput, items: [] };
    await expect(updateColacion(creado.id, invalido)).rejects.toThrow();
  });
});
