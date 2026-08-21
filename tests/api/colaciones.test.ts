import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../helpers/mockFirestore';
import {
  getColaciones,
  getColacion,
  getColacionActiva,
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

describe('api/colaciones — regla "solo una activa a la vez"', () => {
  it('createColacion con activa=true desactiva las demás (solo una activa a la vez)', async () => {
    const primera = await createColacion({ ...colacionInput, activa: true, nombre: 'Primera' });
    expect(primera.activa).toBe(true);

    const segunda = await createColacion({ ...colacionInput, activa: true, nombre: 'Segunda' });
    expect(segunda.activa).toBe(true);

    const lista = await getColaciones();
    expect(lista).toHaveLength(2);

    const primeraReload = lista.find((c) => c.id === primera.id);
    const segundaReload = lista.find((c) => c.id === segunda.id);
    expect(primeraReload?.activa).toBe(false);
    expect(segundaReload?.activa).toBe(true);
  });

  it('activarColacion desactiva las demás', async () => {
    const primera = await createColacion({ ...colacionInput, activa: false, nombre: 'Primera' });
    const segunda = await createColacion({ ...colacionInput, activa: false, nombre: 'Segunda' });

    await activarColacion(primera.id);
    let lista = await getColaciones();
    expect(lista.find((c) => c.id === primera.id)?.activa).toBe(true);
    expect(lista.find((c) => c.id === segunda.id)?.activa).toBe(false);

    await activarColacion(segunda.id);
    lista = await getColaciones();
    expect(lista.find((c) => c.id === segunda.id)?.activa).toBe(true);
    expect(lista.find((c) => c.id === primera.id)?.activa).toBe(false);
  });

  it('getColacionActiva retorna solo la colacion activa', async () => {
    const primera = await createColacion({ ...colacionInput, activa: false, nombre: 'Primera' });
    const segunda = await createColacion({ ...colacionInput, activa: false, nombre: 'Segunda' });
    await activarColacion(segunda.id);

    const activa = await getColacionActiva();
    expect(activa).not.toBeNull();
    expect(activa?.id).toBe(segunda.id);
    expect(activa?.activa).toBe(true);
    expect(activa?.id).not.toBe(primera.id);
  });

  it('getColacionActiva retorna null cuando no hay colacion activa', async () => {
    await createColacion({ ...colacionInput, activa: false, nombre: 'Inactiva' });
    const activa = await getColacionActiva();
    expect(activa).toBeNull();
  });
});

describe('api/colaciones — getColacion (por id)', () => {
  it('getColacion retorna null para id inexistente', async () => {
    const resultado = await getColacion('id-inexistente');
    expect(resultado).toBeNull();
  });

  it('getColacion retorna la colacion por id', async () => {
    const creado = await createColacion({ ...colacionInput, nombre: 'Menú especial' });
    const encontrado = await getColacion(creado.id);
    expect(encontrado).not.toBeNull();
    expect(encontrado?.id).toBe(creado.id);
    expect(encontrado?.nombre).toBe('Menú especial');
    expect(encontrado?.items).toHaveLength(3);
  });
});
