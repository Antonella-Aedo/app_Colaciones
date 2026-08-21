import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../helpers/mockFirestore';
import { PedidoForm } from '../../src/components/PedidoForm';
import type { Producto, Colacion, PedidoInput } from '../../src/types';

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
    fireEvent.click(screen.getByText('Guardar pedido'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.colacionId).toBe('c1');
    expect(input.items).toHaveLength(2);
  });

  it('no permite enviar sin items', async () => {
    const onSubmit = vi.fn();
    render(<PedidoForm productos={productos} colaciones={colaciones} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Juan' } });
    fireEvent.click(screen.getByText('Guardar pedido'));
    await vi.waitFor(() => expect(screen.getByText('Agrega al menos un item')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
