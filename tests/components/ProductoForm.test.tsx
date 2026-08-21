import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../helpers/mockFirestore';
import { ProductoForm } from '../../src/components/ProductoForm';
import type { ProductoInput } from '../../src/types';

beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_CONFIG', '{"projectId":"test"}');
});

describe('ProductoForm', () => {
  it('renderiza campos del formulario', () => {
    render(<ProductoForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/Nombre/)).toBeDefined();
    expect(screen.getByLabelText(/Descripción/)).toBeDefined();
    expect(screen.getByLabelText(/Precio/)).toBeDefined();
    expect(screen.getByLabelText(/^Categoría$/)).toBeDefined();
    expect(screen.getByLabelText(/Disponible/)).toBeDefined();
  });

  it('valida que nombre no esté vacío', async () => {
    const onSubmit = vi.fn();
    render(<ProductoForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    // nombre is empty by default — submit without filling it
    fireEvent.click(screen.getByText('Guardar'));
    await vi.waitFor(() => expect(screen.getByText('El nombre es obligatorio')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('crea producto con datos válidos', async () => {
    const onSubmit = vi.fn(async (_input: ProductoInput): Promise<void> => {});
    render(<ProductoForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Lasaña' } });
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Lasaña de carne' } });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: 5000 } });
    fireEvent.change(screen.getByLabelText(/^Categoría$/), { target: { value: 'fondo' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as ProductoInput;
    expect(input.nombre).toBe('Lasaña');
    expect(input.descripcion).toBe('Lasaña de carne');
    expect(input.precio).toBe(5000);
    expect(input.categoria).toBe('fondo');
    expect(input.disponible).toBe(true);
  });

  it('permite categoría personalizada', async () => {
    const onSubmit = vi.fn(async (_input: ProductoInput): Promise<void> => {});
    render(<ProductoForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Brazo de reina' } });
    // seleccionar "Otra…" en el select de categoría
    fireEvent.change(screen.getByLabelText(/^Categoría$/), { target: { value: '__otra__' } });
    // aparece el input de categoría personalizada
    fireEvent.change(screen.getByLabelText(/Categoría personalizada/), { target: { value: 'Postres' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as ProductoInput;
    // la categoría personalizada se envía en minúsculas y trimada
    expect(input.categoria).toBe('postres');
  });

  it('precio permite 0', async () => {
    const onSubmit = vi.fn(async (_input: ProductoInput): Promise<void> => {});
    render(<ProductoForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Agua de hierba' } });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: 0 } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as ProductoInput;
    expect(input.precio).toBe(0);
  });
});
