import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../helpers/mockFirestore';
import { PedidoForm } from '../../src/components/PedidoForm';
import type { Producto, Colacion, Pedido, PedidoInput } from '../../src/types';

const productos: Producto[] = [
  { id: 'f1', nombre: 'Pescado frito', descripcion: '', precio: 6500, categoria: 'fondo', disponible: true },
  { id: 'b1', nombre: 'Coca-Cola', descripcion: '', precio: 800, categoria: 'bebida', disponible: true },
  { id: 'a1', nombre: 'Arroz', descripcion: '', precio: 0, categoria: 'agregado', disponible: true },
  { id: 'e1', nombre: 'Ensalada surtida', descripcion: '', precio: 0, categoria: 'ensalada', disponible: true },
];

const colaciones: Colacion[] = [
  {
    id: 'c1',
    nombre: 'Menú del día',
    fecha: '2026-08-20',
    activa: true,
    creadoPor: 'Ana',
    items: [
      { productoId: 'f1', rol: 'fondo', orden: 1 },
      { productoId: 'a1', rol: 'agregado', orden: 2 },
    ],
  },
];

beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_CONFIG', '{"projectId":"test"}');
});

describe('PedidoForm', () => {
  it('muestra personalización de agregado/ensalada cuando el rol es fondo (por defecto)', () => {
    render(<PedidoForm productos={productos} colaciones={colaciones} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    // el rol por defecto es 'fondo', así que la personalización aparece
    expect(screen.getByText('Personalización del fondo:')).toBeDefined();
  });

  it('precarga items desde una colación', async () => {
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    render(<PedidoForm productos={productos} colaciones={colaciones} onSubmit={onSubmit} onCancel={vi.fn()} />);

    // seleccionar colación en el select de precarga
    const selectPrecarga = screen.getByLabelText(/Precargar desde colación/);
    fireEvent.change(selectPrecarga, { target: { value: 'c1' } });

    // los items de la colación aparecen (pueden estar en el select y en la lista)
    expect(screen.getAllByText(/Pescado frito/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Arroz/).length).toBeGreaterThan(0);

    // llenar cliente y enviar
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Juan' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.colacionId).toBe('c1');
    expect(input.items).toHaveLength(2);
  });

  it('precarga las notas de los items de la colación en el campo notas (no nota)', async () => {
    const colacionesConNotas: Colacion[] = [
      {
        id: 'c-notas',
        nombre: 'Menú con notas',
        fecha: '2026-08-21',
        activa: true,
        creadoPor: 'Ana',
        items: [
          { productoId: 'f1', rol: 'fondo', orden: 1, nota: 'sin cebolla' },
          { productoId: 'a1', rol: 'agregado', orden: 2, nota: 'porción doble' },
        ],
      },
    ];

    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    render(<PedidoForm productos={productos} colaciones={colacionesConNotas} onSubmit={onSubmit} onCancel={vi.fn()} />);

    // seleccionar colación en el select de precarga
    const selectPrecarga = screen.getByLabelText(/Precargar desde colación/);
    fireEvent.change(selectPrecarga, { target: { value: 'c-notas' } });

    // llenar cliente y enviar
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Juan' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.items).toHaveLength(2);
    // cada item precargado debe conservar su nota en el campo `notas` (plural)
    expect(input.items[0].notas).toBe('sin cebolla');
    expect(input.items[1].notas).toBe('porción doble');
  });

  it('no permite enviar sin items', async () => {
    const onSubmit = vi.fn();
    render(<PedidoForm productos={productos} colaciones={colaciones} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Juan' } });
    fireEvent.click(screen.getByText('Guardar pedido'));
    await vi.waitFor(() => expect(screen.getByText('Agrega al menos un item')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calcula el total correctamente (Σ precio × cantidad)', async () => {
    const productosTotal: Producto[] = [
      { id: 't1', nombre: 'Producto 1500', descripcion: '', precio: 1500, categoria: 'fondo', disponible: true },
      { id: 't2', nombre: 'Producto 1000', descripcion: '', precio: 1000, categoria: 'bebida', disponible: true },
    ];
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    render(<PedidoForm productos={productosTotal} colaciones={[]} onSubmit={onSubmit} onCancel={vi.fn()} />);

    // Item 1: precio=1500, cantidad=2 → 3000
    fireEvent.change(screen.getByDisplayValue('— Producto —'), { target: { value: 't1' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 2 } });
    fireEvent.click(screen.getByText('Agregar'));

    // Item 2: precio=1000, cantidad=1 → 1000
    fireEvent.change(screen.getByDisplayValue('— Producto —'), { target: { value: 't2' } });
    fireEvent.click(screen.getByText('Agregar'));

    // Llenar cliente y enviar
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Juan' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    // Σ precio × cantidad = 1500×2 + 1000×1 = 4000
    expect(input.total).toBe(4000);
  });

  it('precarga datos cuando se proporciona inicial (modo edición)', () => {
    const inicial: Pedido = {
      id: 'p1',
      fecha: '2026-08-19',
      cliente: 'María González',
      registradoPor: 'Ana',
      colacionId: null,
      items: [
        {
          productoId: 'f1',
          nombre: 'Pescado frito',
          precio: 6500,
          cantidad: 2,
          rol: 'fondo',
          agregado: 'Arroz',
          ensalada: 'Ensalada surtida',
          notas: 'sin cebolla',
        },
        {
          productoId: 'b1',
          nombre: 'Coca-Cola',
          precio: 800,
          cantidad: 1,
          rol: 'bebida',
        },
      ],
      total: 13800,
      estado: 'pendiente',
    };

    act(() => {
      render(
        <PedidoForm
          productos={productos}
          colaciones={colaciones}
          inicial={inicial}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
    });

    // el título refleja modo edición
    expect(screen.getByText('Editar pedido')).toBeDefined();
    // el cliente se precarga en el input
    expect((screen.getByLabelText(/Cliente/) as HTMLInputElement).value).toBe('María González');
    // los items precargados aparecen en la lista
    expect(screen.getAllByText(/Pescado frito/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Coca-Cola/).length).toBeGreaterThan(0);
    // el botón de envío refleja modo edición
    expect(screen.getByText('Guardar cambios')).toBeDefined();
  });
});
