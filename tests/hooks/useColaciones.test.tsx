import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { resetStore } from '../helpers/mockFirestore';
import { useColaciones } from '../../src/hooks/useColaciones';
import { createColacion } from '../../src/api/colaciones';
import type { ColacionInput } from '../../src/types';

const colacionInput: ColacionInput = {
  nombre: 'Menú Lunes',
  fecha: '2025-01-01',
  activa: false,
  creadoPor: 'admin',
  items: [
    { productoId: 'p1', rol: 'fondo', orden: 1 },
  ],
};

beforeEach(() => {
  resetStore();
});

describe('useColaciones', () => {
  it('carga colaciones al montar', async () => {
    // pre-poblar
    await createColacion(colacionInput);

    const { result } = renderHook(() => useColaciones());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.colaciones).toHaveLength(1);
    expect(result.current.colaciones[0].nombre).toBe('Menú Lunes');
    expect(result.current.error).toBeNull();
  });

  it('create agrega una colacion a la lista', async () => {
    const { result } = renderHook(() => useColaciones());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create(colacionInput);
    });

    expect(result.current.colaciones).toHaveLength(1);
    expect(result.current.colaciones[0].nombre).toBe('Menú Lunes');
  });

  it('activar actualiza el estado local', async () => {
    const inputA: ColacionInput = { ...colacionInput, nombre: 'Menú A' };
    const inputB: ColacionInput = { ...colacionInput, nombre: 'Menú B' };

    const { result } = renderHook(() => useColaciones());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // crear dos colaciones (ambas inactivas)
    let idA: string;
    let idB: string;
    await act(async () => {
      idA = (await result.current.create(inputA)).id;
      idB = (await result.current.create(inputB)).id;
    });

    expect(result.current.colaciones).toHaveLength(2);

    // activar la segunda
    await act(async () => {
      await result.current.activar(idB!);
    });

    // solo la segunda tiene activa=true en el estado local
    const a = result.current.colaciones.find((c) => c.id === idA);
    const b = result.current.colaciones.find((c) => c.id === idB);
    expect(a?.activa).toBe(false);
    expect(b?.activa).toBe(true);
  });
});
