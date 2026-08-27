import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../helpers/mockFirestore';
import { PedidoForm } from '../../src/components/PedidoForm';
import type { Producto, Colacion, Pedido, PedidoInput, Cliente, ClienteInput } from '../../src/types';

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

const clientes: Cliente[] = [
  { id: 'cli-1', direccion: 'Padre Hurtado 123', contacto: '+56912345678', nombre: 'Juan' },
  { id: 'cli-2', direccion: 'Padre Hurtado 456', contacto: '+56987654321', nombre: 'María' },
];

beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_CONFIG', '{"projectId":"test"}');
});

describe('PedidoForm', () => {
  it('muestra personalización del fondo cuando se selecciona un fondo', () => {
    render(
      <PedidoForm
        productos={productos}
        colaciones={colaciones}
        clientes={clientes}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // Seleccionar un fondo en el primer menú
    const selectFondo = screen.getByLabelText(/Fondo/i);
    fireEvent.change(selectFondo, { target: { value: 'f1' } });
    expect(screen.getByText('Personalización del fondo:')).toBeDefined();
  });

  it('precarga items desde una colación', async () => {
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    render(
      <PedidoForm
        productos={productos}
        colaciones={colaciones}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const selectPrecarga = screen.getByLabelText(/Precargar desde colación/);
    fireEvent.change(selectPrecarga, { target: { value: 'c1' } });

    expect(screen.getAllByText(/Pescado frito/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Arroz/).length).toBeGreaterThan(0);

    // seleccionar cliente
    const selectCliente = screen.getByLabelText(/Cliente/);
    fireEvent.change(selectCliente, { target: { value: 'cli-1' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.colacionId).toBe('c1');
    expect(input.items).toHaveLength(2);
    expect(input.clienteId).toBe('cli-1');
  });

  it('precarga las notas de los items de la colación en el campo notas', async () => {
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
    render(
      <PedidoForm
        productos={productos}
        colaciones={colacionesConNotas}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const selectPrecarga = screen.getByLabelText(/Precargar desde colación/);
    fireEvent.change(selectPrecarga, { target: { value: 'c-notas' } });

    const selectCliente = screen.getByLabelText(/Cliente/);
    fireEvent.change(selectCliente, { target: { value: 'cli-1' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.items).toHaveLength(2);
    // En el modelo de menús, las notas se combinan en el campo notas del fondo
    expect(input.items[0].notas).toContain('sin cebolla');
  });

  it('no permite enviar sin items', async () => {
    const onSubmit = vi.fn();
    render(
      <PedidoForm
        productos={productos}
        colaciones={colaciones}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    const selectCliente = screen.getByLabelText(/Cliente/);
    fireEvent.change(selectCliente, { target: { value: 'cli-1' } });
    fireEvent.click(screen.getByText('Guardar pedido'));
    await vi.waitFor(() => expect(screen.getByText('Agrega al menos un item')).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('no permite enviar sin seleccionar cliente', async () => {
    const onSubmit = vi.fn();
    render(
      <PedidoForm
        productos={productos}
        colaciones={colaciones}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    // seleccionar un fondo (crea un item) sin seleccionar cliente
    fireEvent.change(screen.getByLabelText(/Fondo/i), { target: { value: 'f1' } });
    fireEvent.click(screen.getByText('Guardar pedido'));
    await vi.waitFor(() => expect(screen.getByText(/cliente es obligatorio/i)).toBeDefined());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calcula el total correctamente (Σ precio × cantidad)', async () => {
    const productosTotal: Producto[] = [
      { id: 't1', nombre: 'Producto 1500', descripcion: '', precio: 1500, categoria: 'fondo', disponible: true },
      { id: 't2', nombre: 'Producto 1000', descripcion: '', precio: 1000, categoria: 'bebida', disponible: true },
    ];
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    render(
      <PedidoForm
        productos={productosTotal}
        colaciones={[]}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    // Seleccionar fondo y setear cantidad a 2
    fireEvent.change(screen.getByLabelText(/Fondo/i), { target: { value: 't1' } });
    fireEvent.change(screen.getByLabelText(/Cantidad/i), { target: { value: 2 } });

    // Agregar un extra (bebida)
    fireEvent.change(screen.getByDisplayValue('— Producto —'), { target: { value: 't2' } });
    fireEvent.click(screen.getByText('Agregar extra'));

    const selectCliente = screen.getByLabelText(/Cliente/);
    fireEvent.change(selectCliente, { target: { value: 'cli-1' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    // Σ precio × cantidad = 1500×2 + 1000×1 = 4000 (retiro por defecto, sin delivery)
    expect(input.total).toBe(4000);
  });

  it('suma delivery al total cuando tipoEntrega=delivery', async () => {
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    render(
      <PedidoForm
        productos={productos}
        colaciones={[]}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    // Seleccionar fondo
    fireEvent.change(screen.getByLabelText(/Fondo/i), { target: { value: 'f1' } });

    const selectCliente = screen.getByLabelText(/Cliente/);
    fireEvent.change(selectCliente, { target: { value: 'cli-1' } });

    // seleccionar delivery
    const radioDelivery = screen.getByLabelText(/Delivery/i);
    fireEvent.click(radioDelivery);

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.tipoEntrega).toBe('delivery');
    expect(input.deliveryCost).toBe(1300);
    // 6500 (fondo) + 1300 (delivery) = 7800
    expect(input.total).toBe(7800);
  });

  it('precarga datos cuando se proporciona inicial (modo edición)', () => {
    const inicial: Pedido = {
      id: 'p1',
      fecha: '2026-08-19',
      clienteId: 'cli-1',
      clienteNombre: 'María González',
      clienteDireccion: 'Padre Hurtado 123',
      clienteContacto: '+56912345678',
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
      estado: 'creado',
      tipoEntrega: 'retiro',
      deliveryCost: 0,
      metodoPago: 'efectivo',
      estadoPago: 'pendiente',
    };

    act(() => {
      render(
        <PedidoForm
          productos={productos}
          colaciones={colaciones}
          clientes={clientes}
          inicial={inicial}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
    });

    expect(screen.getAllByText(/Pescado frito/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Coca-Cola/).length).toBeGreaterThan(0);
    expect(screen.getByText('Guardar cambios')).toBeDefined();
  });

  it('en modo cliente nuevo, el checkbox "Guardar cliente" aparece desmarcado por defecto', () => {
    render(
      <PedidoForm
        productos={productos}
        colaciones={colaciones}
        clientes={clientes}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Crear cliente nuevo/i }));
    const checkbox = screen.getByLabelText(/Guardar cliente en el catálogo/i);
    expect(checkbox).toBeDefined();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('con checkbox desmarcado: NO llama onCrearCliente y envía clienteId vacío', async () => {
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    const onCrearCliente = vi.fn(async (_input: ClienteInput): Promise<Cliente> => {
      return { id: 'nuevo-1', direccion: 'x', contacto: 'y', nombre: null };
    });
    render(
      <PedidoForm
        productos={productos}
        colaciones={[]}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        onCrearCliente={onCrearCliente}
      />,
    );

    // Seleccionar un fondo (crea un item)
    fireEvent.change(screen.getByLabelText(/Fondo/i), { target: { value: 'f1' } });

    // Cambiar a modo cliente nuevo
    fireEvent.click(screen.getByRole('tab', { name: /Crear cliente nuevo/i }));

    // Llenar datos del cliente (dirección y contacto obligatorios)
    fireEvent.change(screen.getByPlaceholderText(/Av. Siempre Viva/i), { target: { value: 'Nueva 100' } });
    fireEvent.change(screen.getByPlaceholderText(/\+56 9/i), { target: { value: '+56911111111' } });

    // Checkbox desmarcado por defecto → guardar
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect(onCrearCliente).not.toHaveBeenCalled();
    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.clienteId).toBe('');
    expect(input.clienteDireccion).toBe('Nueva 100');
    expect(input.clienteContacto).toBe('+56911111111');
  });

  it('con checkbox marcado: llama onCrearCliente y usa el id retornado', async () => {
    const onSubmit = vi.fn(async (_input: PedidoInput): Promise<void> => {});
    const onCrearCliente = vi.fn(async (input: ClienteInput): Promise<Cliente> => {
      return { id: 'nuevo-1', direccion: input.direccion, contacto: input.contacto, nombre: input.nombre ?? null };
    });
    render(
      <PedidoForm
        productos={productos}
        colaciones={[]}
        clientes={clientes}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        onCrearCliente={onCrearCliente}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Fondo/i), { target: { value: 'f1' } });
    fireEvent.click(screen.getByRole('tab', { name: /Crear cliente nuevo/i }));
    fireEvent.change(screen.getByPlaceholderText(/Av. Siempre Viva/i), { target: { value: 'Nueva 100' } });
    fireEvent.change(screen.getByPlaceholderText(/\+56 9/i), { target: { value: '+56911111111' } });

    // Marcar el checkbox
    const checkbox = screen.getByLabelText(/Guardar cliente en el catálogo/i);
    fireEvent.click(checkbox);

    await act(async () => {
      fireEvent.click(screen.getByText('Guardar pedido'));
    });
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect(onCrearCliente).toHaveBeenCalledTimes(1);
    const input = onSubmit.mock.calls[0][0] as PedidoInput;
    expect(input.clienteId).toBe('nuevo-1');
  });

  it('al editar un pedido existente no muestra el checkbox de guardar cliente', () => {
    const inicial: Pedido = {
      id: 'p1',
      fecha: '2026-08-19',
      clienteId: 'cli-1',
      clienteNombre: 'María González',
      clienteDireccion: 'Padre Hurtado 123',
      clienteContacto: '+56912345678',
      registradoPor: 'Ana',
      colacionId: null,
      items: [
        { productoId: 'f1', nombre: 'Pescado frito', precio: 6500, cantidad: 1, rol: 'fondo' },
      ],
      total: 6500,
      estado: 'creado',
      tipoEntrega: 'retiro',
      deliveryCost: 0,
      metodoPago: 'efectivo',
      estadoPago: 'pendiente',
    };
    render(
      <PedidoForm
        productos={productos}
        colaciones={colaciones}
        clientes={clientes}
        inicial={inicial}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Guardar cliente en el catálogo/i)).toBeNull();
  });
});
