import { describe, it, expect, beforeEach } from 'vitest';
import { installTestDb } from '../helpers/testDb';
import {
  getPlatos,
  getPlato,
  getPlatosActivos,
  createPlato,
  updatePlato,
  deletePlato,
  setPlatoActiva,
} from '../../src/api/platos';
import type { PlatoInput } from '../../src/types';

const platoInput: PlatoInput = {
  nombre: 'Menú del día',
  tipo: 'menu',
  fecha: '2026-08-20',
  activa: false,
  creadoPor: 'Ana',
  items: [
    { productoId: 'p1', rol: 'fondo', orden: 1 },
    { productoId: 'p2', rol: 'agregado', orden: 2 },
    { productoId: 'p3', rol: 'ensalada', orden: 3 },
  ],
};

const colacionInput: PlatoInput = {
  nombre: 'Colación estándar',
  tipo: 'colacion',
  valor: 6500,
  activa: false,
  creadoPor: 'Ana',
  items: [
    { productoId: 'p1', rol: 'fondo', orden: 1 },
    { productoId: 'p3', rol: 'ensalada', orden: 2 },
  ],
};

beforeEach(() => {
  installTestDb();
});

describe('api/platos (SQLite local)', () => {
  it('createPlato agrega y devuelve con id', async () => {
    const creado = await createPlato(platoInput);
    expect(creado.id).toBeTruthy();
    expect(creado.nombre).toBe('Menú del día');
    expect(creado.tipo).toBe('menu');
    expect(creado.items).toHaveLength(3);
  });

  it('persiste tipo, valor y foto', async () => {
    const creado = await createPlato({ ...colacionInput, foto: 'cazuela' });
    expect(creado.tipo).toBe('colacion');
    expect(creado.valor).toBe(6500);
    expect(creado.foto).toBe('cazuela');
    const lista = await getPlatos();
    expect(lista[0].valor).toBe(6500);
    const actualizado = await updatePlato(creado.id, { ...colacionInput, foto: 'salmon', valor: 7000 });
    expect(actualizado.foto).toBe('salmon');
    expect(actualizado.valor).toBe(7000);
  });

  it('una colación puede no tener fecha', async () => {
    const creado = await createPlato(colacionInput);
    expect(creado.fecha).toBeUndefined();
  });

  it('getPlatos devuelve la lista', async () => {
    await createPlato(platoInput);
    const lista = await getPlatos();
    expect(lista).toHaveLength(1);
  });

  it('updatePlato reemplaza los datos', async () => {
    const creado = await createPlato(platoInput);
    const actualizado = await updatePlato(creado.id, { ...platoInput, nombre: 'Otro' });
    expect(actualizado.nombre).toBe('Otro');
  });

  it('deletePlato elimina', async () => {
    const creado = await createPlato(platoInput);
    await deletePlato(creado.id);
    const lista = await getPlatos();
    expect(lista).toHaveLength(0);
  });
});

describe('api/platos (validación runtime)', () => {
  it('rechaza items vacío', async () => {
    await expect(createPlato({ ...platoInput, items: [] })).rejects.toThrow();
  });

  it('rechaza rol de item inválido', async () => {
    const invalido = {
      ...platoInput,
      items: [{ productoId: 'p1', rol: 'invalido' as never, orden: 1 }],
    };
    await expect(createPlato(invalido)).rejects.toThrow();
  });

  it('rechaza tipo inválido', async () => {
    const invalido = { ...platoInput, tipo: 'otro' as never };
    await expect(createPlato(invalido)).rejects.toThrow();
  });

  it('una colación SIN valor predeterminado es inválida', async () => {
    const invalido: PlatoInput = { ...colacionInput };
    delete invalido.valor;
    await expect(createPlato(invalido)).rejects.toThrow(/valor/i);
    await expect(createPlato({ ...colacionInput, valor: 0 })).rejects.toThrow();
  });

  it('un menú SIN fecha es inválido; una colación sin fecha es válida', async () => {
    const menuSinFecha: PlatoInput = { ...platoInput };
    delete menuSinFecha.fecha;
    await expect(createPlato(menuSinFecha)).rejects.toThrow(/fecha/i);
    await expect(createPlato(colacionInput)).resolves.toBeTruthy();
  });

  it('updatePlato rechaza items vacío', async () => {
    const creado = await createPlato(platoInput);
    await expect(updatePlato(creado.id, { ...platoInput, items: [] })).rejects.toThrow();
  });
});

describe('api/platos — "disponible hoy" permite varios activos', () => {
  it('varios platos pueden estar activos a la vez (crear activo NO desactiva)', async () => {
    const primera = await createPlato({ ...platoInput, activa: true, nombre: 'Primera' });
    const segunda = await createPlato({ ...colacionInput, activa: true, nombre: 'Segunda' });

    const lista = await getPlatos();
    expect(lista).toHaveLength(2);
    expect(lista.find((c) => c.id === primera.id)?.activa).toBe(true);
    expect(lista.find((c) => c.id === segunda.id)?.activa).toBe(true);
  });

  it('setPlatoActiva es toggle independiente por plato', async () => {
    const primera = await createPlato({ ...platoInput, nombre: 'Primera' });
    const segunda = await createPlato({ ...platoInput, nombre: 'Segunda' });

    await setPlatoActiva(primera.id, true);
    await setPlatoActiva(segunda.id, true);
    let lista = await getPlatos();
    expect(lista.filter((c) => c.activa)).toHaveLength(2);

    await setPlatoActiva(primera.id, false);
    lista = await getPlatos();
    expect(lista.find((c) => c.id === primera.id)?.activa).toBe(false);
    expect(lista.find((c) => c.id === segunda.id)?.activa).toBe(true);
  });

  it('getPlatosActivos retorna TODOS los activos', async () => {
    const a = await createPlato({ ...platoInput, activa: true, nombre: 'A' });
    const b = await createPlato({ ...colacionInput, activa: true, nombre: 'B' });
    await createPlato({ ...platoInput, nombre: 'Inactivo' });

    const activos = await getPlatosActivos();
    expect(activos).toHaveLength(2);
    expect(activos.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('getPlatosActivos retorna vacío cuando nada está activo', async () => {
    await createPlato({ ...platoInput });
    expect(await getPlatosActivos()).toHaveLength(0);
  });
});

describe('api/platos — getPlato (por id)', () => {
  it('getPlato retorna null para id inexistente', async () => {
    expect(await getPlato('id-inexistente')).toBeNull();
  });

  it('getPlato retorna el plato por id', async () => {
    const creado = await createPlato({ ...platoInput, nombre: 'Menú especial' });
    const encontrado = await getPlato(creado.id);
    expect(encontrado?.id).toBe(creado.id);
    expect(encontrado?.nombre).toBe('Menú especial');
    expect(encontrado?.items).toHaveLength(3);
  });
});
