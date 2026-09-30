import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { installTestDb } from '../helpers/testDb';
import { usePlatos } from '../../src/hooks/usePlatos';
import { createPlato } from '../../src/api/platos';
import type { PlatoInput } from '../../src/types';

const platoInput: PlatoInput = {
  nombre: 'Menú Lunes',
  tipo: 'menu',
  fecha: '2025-01-01',
  activa: false,
  creadoPor: 'admin',
  items: [
    { productoId: 'p1', rol: 'fondo', orden: 1 },
  ],
};

beforeEach(() => {
  installTestDb();
});

describe('usePlatos', () => {
  it('carga platos al montar', async () => {
    // pre-poblar
    await createPlato(platoInput);

    const { result } = renderHook(() => usePlatos());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.platos).toHaveLength(1);
    expect(result.current.platos[0].nombre).toBe('Menú Lunes');
    expect(result.current.error).toBeNull();
  });

  it('create agrega un plato a la lista', async () => {
    const { result } = renderHook(() => usePlatos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create(platoInput);
    });

    expect(result.current.platos).toHaveLength(1);
    expect(result.current.platos[0].nombre).toBe('Menú Lunes');
  });

  it('setActiva es toggle independiente por plato (multi-activo)', async () => {
    const inputA: PlatoInput = { ...platoInput, nombre: 'Menú A' };
    const inputB: PlatoInput = { ...platoInput, nombre: 'Menú B' };

    const { result } = renderHook(() => usePlatos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let idA: string;
    let idB: string;
    await act(async () => {
      idA = (await result.current.create(inputA)).id;
      idB = (await result.current.create(inputB)).id;
    });

    // activar AMBAS: con multi-activo, la segunda no apaga la primera
    await act(async () => {
      await result.current.setActiva(idA!, true);
      await result.current.setActiva(idB!, true);
    });
    expect(result.current.platos.filter((p) => p.activa)).toHaveLength(2);

    // desactivar A no toca a B
    await act(async () => {
      await result.current.setActiva(idA!, false);
    });
    const a = result.current.platos.find((c) => c.id === idA);
    const b = result.current.platos.find((c) => c.id === idB);
    expect(a?.activa).toBe(false);
    expect(b?.activa).toBe(true);
  });
});
