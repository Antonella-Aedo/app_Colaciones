import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { installTestDb } from '../helpers/testDb';
import { PlatoList } from '../../src/components/PlatoList';
import type { Plato, PlatoItem, RolItem } from '../../src/types';

const productosMap = new Map<string, string>([
  ['p1', 'Cazuela de osobuco'],
  ['p2', 'Tallarines al pesto'],
  ['p3', 'Arroz'],
  ['p4', 'Ensalada surtida'],
  ['p5', 'Pan amasado'],
  ['p6', 'Bebida 250 ml'],
]);

const item = (productoId: string, rol: RolItem, orden: number, nota?: string): PlatoItem => {
  const it: PlatoItem = { productoId, rol, orden };
  if (nota) it.nota = nota;
  return it;
};

const plato = (over: Partial<Plato> & Pick<Plato, 'id'>): Plato => ({
  nombre: 'Menú del día',
  tipo: 'menu',
  fecha: '2026-09-29', // martes
  activa: false,
  creadoPor: 'cocina@colaciones.cl',
  items: [item('p1', 'fondo', 1), item('p3', 'agregado', 2)],
  ...over,
});

const menuCompleto = plato({
  id: 'c1',
  activa: true,
  items: [
    item('p1', 'fondo', 1, 'con hueso'),
    item('p2', 'fondo', 2),
    item('p3', 'agregado', 3),
    item('p4', 'ensalada', 4),
    item('p5', 'extra', 5, 'dos unidades'),
    item('p6', 'extra', 6),
  ],
});

function renderList(platos: Plato[]) {
  return render(
    <PlatoList
      platos={platos}
      productosMap={productosMap}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onToggleActiva={vi.fn()}
      loading={false}
      error={null}
    />,
  );
}

beforeEach(() => {
  installTestDb();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlatoList', () => {
  it('renderiza el card poster: nombre, día en grande y acciones', () => {
    renderList([menuCompleto]);
    expect(screen.getByText('Menú del día')).toBeDefined();
    expect(screen.getByText('martes')).toBeDefined();
    expect(screen.getByText('★ Disponible hoy')).toBeDefined();
    expect(screen.getByText('Editar')).toBeDefined();
    expect(screen.getByText('Eliminar')).toBeDefined();
  });

  it('recorta los ítems visibles a 4 y anuncia los restantes', () => {
    renderList([menuCompleto]); // 6 ítems
    expect(screen.getByText('Cazuela de osobuco')).toBeDefined();
    expect(screen.getByText('Ensalada surtida')).toBeDefined();
    // 5º y 6º no se ven en la card
    expect(screen.queryByText('Pan amasado')).toBeNull();
    expect(screen.getByText(/\+2 más/)).toBeDefined();
  });

  it('el ojo abre el detalle con TODOS los ítems y cierra al pulsar fuera', async () => {
    renderList([menuCompleto]);
    fireEvent.click(screen.getByRole('button', { name: /ver plato completo/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeDefined();
    // Los ítems ocultos en la card sí están en el detalle
    expect(screen.getByText('Pan amasado')).toBeDefined();
    expect(screen.getByText('Bebida 250 ml')).toBeDefined();

    // Click en el overlay (fuera del panel) → cierra
    vi.useFakeTimers();
    fireEvent.mouseDown(dialog.parentElement!);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape cierra el detalle', async () => {
    renderList([menuCompleto]);
    fireEvent.click(screen.getByRole('button', { name: /ver plato completo/i }));
    await screen.findByRole('dialog');
    vi.useFakeTimers();
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('el botón de disponibilidad es toggle: invoca onToggleActiva con el plato', () => {
    const onToggle = vi.fn();
    render(
      <PlatoList
        platos={[menuCompleto]}
        productosMap={productosMap}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleActiva={onToggle}
      />,
    );
    fireEvent.click(screen.getByText('★ Disponible hoy'));
    expect(onToggle).toHaveBeenCalledWith(menuCompleto);
  });

  it('una colación sin fecha muestra el nombre como titular y su valor', () => {
    const colacionFija = plato({
      id: 'col1',
      nombre: 'Colación estándar',
      tipo: 'colacion',
      valor: 6500,
      fecha: undefined,
    });
    renderList([colacionFija]);
    // El titular grande es el nombre (no hay día de semana)
    expect(screen.getByText('Colación estándar')).toBeDefined();
    // El eyebrow muestra Colación + valor, y la meta el "Valor fijo"
    expect(screen.getByText(/Colación · \$6\.500/)).toBeDefined();
    expect(screen.getByText(/Valor fijo/)).toBeDefined();
  });

  it('renderiza la foto del plato cuando trae clave de foto', async () => {
    const { container, unmount } = renderList([plato({ id: 'cf', foto: 'cazuela' })]);
    const img = container.querySelector<HTMLImageElement>('article img');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('cazuela');
    unmount();

    // Sin foto: la card sigue válida y no renderiza imagen
    const sinFoto = renderList([plato({ id: 'cs' })]);
    expect(sinFoto.container.querySelector('article img')).toBeNull();
    expect(sinFoto.getByText('Menú del día')).toBeDefined();
    sinFoto.unmount();
  });

  it('la foto también aparece en el detalle del plato', async () => {
    const { container } = renderList([plato({ id: 'cf', foto: 'salmon' })]);
    fireEvent.click(screen.getByRole('button', { name: /ver plato completo/i }));
    await screen.findByRole('dialog');
    const imgs = [...container.querySelectorAll<HTMLImageElement>('img')].filter((i) =>
      i.src.includes('salmon'),
    );
    expect(imgs.length).toBe(2); // card + modal
  });
});
