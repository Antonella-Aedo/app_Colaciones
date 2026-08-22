import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../helpers/mockFirestore';
import { ClienteForm } from '../../src/components/ClienteForm';
import type { Cliente, ClienteInput } from '../../src/types';

beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_CONFIG', '{"projectId":"test"}');
});

describe('ClienteForm', () => {
  it('renderiza campos del formulario', () => {
    render(<ClienteForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/Dirección/)).toBeDefined();
    expect(screen.getByLabelText(/Contacto/)).toBeDefined();
    expect(screen.getByLabelText(/^Nombre$/)).toBeDefined();
    expect(screen.getByText('Guardar')).toBeDefined();
  });

  it('exige dirección', async () => {
    const onSubmit = vi.fn();
    render(<ClienteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Guardar'));
    await vi.waitFor(() => expect(screen.getByText('La dirección es obligatoria')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige contacto cuando ya hay dirección', async () => {
    const onSubmit = vi.fn();
    render(<ClienteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Dirección/), { target: { value: 'Av. Balmaceda 1240' } });
    fireEvent.click(screen.getByText('Guardar'));
    await vi.waitFor(() => expect(screen.getByText('El contacto es obligatorio')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('crea cliente con datos válidos y recorta espacios', async () => {
    const onSubmit = vi.fn(async (_input: ClienteInput): Promise<void> => {});
    render(<ClienteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Dirección/), { target: { value: '  Av. Balmaceda 1240  ' } });
    fireEvent.change(screen.getByLabelText(/Contacto/), { target: { value: ' +56 9 1234 5678 ' } });
    fireEvent.change(screen.getByLabelText(/^Nombre$/), { target: { value: ' Constructora Andes ' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as ClienteInput;
    expect(input.direccion).toBe('Av. Balmaceda 1240');
    expect(input.contacto).toBe('+56 9 1234 5678');
    expect(input.nombre).toBe('Constructora Andes');
  });

  it('nombre vacío se guarda como null, no como cadena vacía', async () => {
    const onSubmit = vi.fn(async (_input: ClienteInput): Promise<void> => {});
    render(<ClienteForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Dirección/), { target: { value: 'Los Robles 45' } });
    fireEvent.change(screen.getByLabelText(/Contacto/), { target: { value: '+56 2 2555 0000' } });
    fireEvent.change(screen.getByLabelText(/^Nombre$/), { target: { value: '   ' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect((onSubmit.mock.calls[0][0] as ClienteInput).nombre).toBeNull();
  });

  it('precarga los valores al editar', () => {
    const inicial: Cliente = {
      id: 'c1',
      direccion: 'Av. Balmaceda 1240',
      contacto: '+56 9 1234 5678',
      nombre: 'Constructora Andes',
    };
    render(<ClienteForm inicial={inicial} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByDisplayValue('Av. Balmaceda 1240')).toBeDefined();
    expect(screen.getByDisplayValue('+56 9 1234 5678')).toBeDefined();
    expect(screen.getByDisplayValue('Constructora Andes')).toBeDefined();
  });

  it('Cancelar avisa a la página para cerrar el drawer', () => {
    const onCancel = vi.fn();
    render(<ClienteForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
