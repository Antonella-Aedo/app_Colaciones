import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { installTestDb } from '../helpers/testDb';
import { PlatoForm } from '../../src/components/PlatoForm';
import type { Producto, PlatoInput } from '../../src/types';

const productos: Producto[] = [
  { id: 'f1', nombre: 'Pescado frito', descripcion: '', precio: 6500, categoria: 'fondo', disponible: true },
  { id: 'a1', nombre: 'Arroz', descripcion: '', precio: 0, categoria: 'agregado', disponible: true },
  { id: 'e1', nombre: 'Ensalada surtida', descripcion: '', precio: 0, categoria: 'ensalada', disponible: true },
];

beforeEach(() => {
  installTestDb();
});

describe('PlatoForm', () => {
  it('renderiza con productos del catálogo', () => {
    render(<PlatoForm productos={productos} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Guardar plato')).toBeDefined();
    expect(screen.getByText('Pescado frito (fondo)')).toBeDefined();
  });

  it('no permite guardar sin items', async () => {
    const onSubmit = vi.fn();
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú' } });
    fireEvent.click(screen.getByText('Guardar plato'));
    await vi.waitFor(() => expect(screen.getByText('Agrega al menos un item al plato')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requiere al menos un item con rol fondo', async () => {
    const onSubmit = vi.fn();
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú' } });

    // agregar un item con rol ensalada (no fondo)
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByDisplayValue('fondo'), { target: { value: 'ensalada' } });
    fireEvent.click(screen.getByText('Agregar'));

    fireEvent.click(screen.getByText('Guardar plato'));
    await vi.waitFor(() =>
      expect(screen.getByText('El plato debe tener al menos un item con rol "fondo"')).toBeDefined(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('agrega item fondo y guarda', async () => {
    const onSubmit = vi.fn(async (_input: PlatoInput): Promise<void> => {});
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú del día' } });

    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Agregar'));

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar plato'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as PlatoInput;
    expect(input.nombre).toBe('Menú del día');
    expect(input.items).toHaveLength(1);
    expect(input.items[0].rol).toBe('fondo');
  });

  it('sin nota, el item NO lleva la clave `nota` (Firestore rechaza undefined)', async () => {
    // Regresión: el form ponía `nota: nota.trim() || undefined`, y Firestore
    // rechaza el documento entero con "Unsupported field value: undefined",
    // rompiendo la creación de platos en producción.
    const onSubmit = vi.fn(async (_input: PlatoInput): Promise<void> => {});
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú sin nota' } });

    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Agregar'));

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar plato'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PlatoInput;
    expect(Object.keys(input.items[0])).not.toContain('nota');
    expect(JSON.stringify(input)).not.toContain('undefined');
  });

  it('con nota, el item sí la incluye', async () => {
    const onSubmit = vi.fn(async (_input: PlatoInput): Promise<void> => {});
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú con nota' } });

    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.change(screen.getByPlaceholderText('nota opcional'), { target: { value: 'sin sal' } });
    fireEvent.click(screen.getByText('Agregar'));

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar plato'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PlatoInput;
    expect(input.items[0].nota).toBe('sin sal');
  });

  it('no permite agregar más de un item con rol agregado', async () => {
    const onSubmit = vi.fn();
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
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
      expect(screen.getByText('Solo se permite un agregado por plato')).toBeDefined(),
    );
    // solo debe haber 2 items en la lista (fondo + 1 agregado), no 3
    expect(screen.getAllByText('Quitar')).toHaveLength(2);
  });

  it('el submit incluye tipo=menu y fecha por defecto', async () => {
    const onSubmit = vi.fn(async (_input: PlatoInput): Promise<void> => {});
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Menú' } });
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Agregar'));
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar plato'));
    });
    const input = onSubmit.mock.calls[0][0] as PlatoInput;
    expect(input.tipo).toBe('menu');
    expect(input.fecha).toBeTruthy();
  });

  it('tipo colación exige valor > 0 y lo envía como número', async () => {
    const onSubmit = vi.fn(async (_input: PlatoInput): Promise<void> => {});
    render(<PlatoForm productos={productos} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Tipo/), {
      target: { value: 'colacion' },
    });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Colación fija' } });
    fireEvent.change(screen.getByDisplayValue('— Producto del catálogo —'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Agregar'));

    // sin valor → error de validación del form
    fireEvent.click(screen.getByText('Guardar plato'));
    await vi.waitFor(() =>
      expect(screen.getByText(/valor predeterminado/i)).toBeDefined(),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    // con valor → submit con valor numérico y sin fecha obligatoria
    fireEvent.change(screen.getByLabelText(/Valor fijo/), { target: { value: '6800' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar plato'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as PlatoInput;
    expect(input.tipo).toBe('colacion');
    expect(input.valor).toBe(6800);
  });
});
