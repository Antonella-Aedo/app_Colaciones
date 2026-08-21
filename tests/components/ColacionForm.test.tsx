import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../helpers/mockFirestore';
import { ColacionForm } from '../../src/components/ColacionForm';
import type { Producto, ColacionInput } from '../../src/types';

const productos: Producto[] = [
  { id: 'f1', nombre: 'Pescado frito', descripcion: '', precio: 6500, categoria: 'fondo', disponible: true },
  { id: 'a1', nombre: 'Arroz', descripcion: '', precio: 0, categoria: 'agregado', disponible: true },
  { id: 'e1', nombre: 'Ensalada surtida', descripcion: '', precio: 0, categoria: 'ensalada', disponible: true },
];

beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_CONFIG', '{"projectId":"test"}');
});

describe('ColacionForm', () => {
  it('renderiza con productos del catálogo', () => {
    render(<ColacionForm productos={productos} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Nueva colación')).toBeDefined();
    expect(screen.getByText('Pescado frito (fondo)')).toBeDefined();
  });

  it('no permite guardar sin items', async () => {
    const onSubmit = vi.fn();
    render(<ColacionForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú' } });
    fireEvent.click(screen.getByText('Guardar colación'));
    await vi.waitFor(() => expect(screen.getByText('Agrega al menos un item a la colación')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requiere al menos un item con rol fondo', async () => {
    const onSubmit = vi.fn();
    render(<ColacionForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú' } });

    // agregar un item con rol ensalada (no fondo)
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByDisplayValue('fondo'), { target: { value: 'ensalada' } });
    fireEvent.click(screen.getByText('Agregar'));

    fireEvent.click(screen.getByText('Guardar colación'));
    await vi.waitFor(() =>
      expect(screen.getByText('La colación debe tener al menos un item con rol "fondo"')).toBeDefined(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('agrega item fondo y guarda', async () => {
    const onSubmit = vi.fn(async (_input: ColacionInput): Promise<void> => {});
    render(<ColacionForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú del día' } });

    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Agregar'));

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar colación'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as ColacionInput;
    expect(input.nombre).toBe('Menú del día');
    expect(input.items).toHaveLength(1);
    expect(input.items[0].rol).toBe('fondo');
  });

  it('no permite agregar más de un item con rol agregado', async () => {
    const onSubmit = vi.fn();
    render(<ColacionForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú' } });

    // agregar un item con rol fondo
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Agregar'));

    // agregar un item con rol agregado
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'a1' } });
    fireEvent.change(screen.getByDisplayValue('fondo'), { target: { value: 'agregado' } });
    fireEvent.click(screen.getByText('Agregar'));

    // intentar agregar un segundo item con rol agregado (el select de rol sigue en 'agregado')
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'a1' } });
    fireEvent.click(screen.getByText('Agregar'));

    // el segundo agregado debe ser rechazado con un mensaje de error
    await vi.waitFor(() =>
      expect(screen.getByText('Solo se permite un agregado por colación')).toBeDefined(),
    );
    // solo debe haber 2 items en la lista (fondo + 1 agregado), no 3
    expect(screen.getAllByText('Quitar')).toHaveLength(2);
  });
});
