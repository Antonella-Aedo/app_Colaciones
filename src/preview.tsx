// Banco de pruebas visual del sistema de diseño.
// Renderiza las vistas con datos falsos, sin Firebase ni sesión, para revisar
// jerarquía, densidad y estados sin tener que iniciar sesión con Google.
// Se sirve solo en dev (`vite`), en /preview.html — no entra al build.
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/global.css';
import { ProductoList } from './components/ProductoList';
import { PedidoList } from './components/PedidoList';
import { PageHeader } from './components/PageHeader';
import type { Pedido, Producto } from './types';

const productos: Producto[] = [
  { id: '1', nombre: 'Pollo arvejado', descripcion: 'Pollo en salsa con arvejas y arroz graneado', precio: 4500, categoria: 'fondo', disponible: true },
  { id: '2', nombre: 'Carne mechada', descripcion: 'Mechada al jugo, cocción lenta 6 horas', precio: 5200, categoria: 'fondo', disponible: true },
  { id: '3', nombre: 'Pastel de choclo', descripcion: 'Con pino y presa de pollo', precio: 5800, categoria: 'fondo', disponible: false },
  { id: '4', nombre: 'Ensalada chilena', descripcion: 'Tomate y cebolla en pluma', precio: 1500, categoria: 'ensalada', disponible: true },
  { id: '5', nombre: 'Ensalada surtida', descripcion: 'Lechuga, betarraga y zanahoria', precio: 1800, categoria: 'ensalada', disponible: true },
  { id: '6', nombre: 'Puré de papas', descripcion: '', precio: 1200, categoria: 'agregado', disponible: true },
  { id: '7', nombre: 'Arroz graneado', descripcion: '', precio: 1000, categoria: 'agregado', disponible: true },
  { id: '8', nombre: 'Crema de zapallo', descripcion: 'Con un toque de jengibre', precio: 2200, categoria: 'crema', disponible: true },
  { id: '9', nombre: 'Bebida lata 350cc', descripcion: 'Coca-Cola, Sprite o Fanta', precio: 1200, categoria: 'bebida', disponible: true },
  { id: '10', nombre: 'Jugo natural', descripcion: 'Naranja o piña, medio litro', precio: 1800, categoria: 'bebida', disponible: false },
  { id: '11', nombre: 'Palta molida', descripcion: '', precio: 900, categoria: 'extra', disponible: true },
  { id: '12', nombre: 'Pan amasado', descripcion: 'Dos unidades', precio: 700, categoria: '', disponible: true },
];

function pedido(over: Partial<Pedido> & Pick<Pedido, 'id' | 'estado'>): Pedido {
  return {
    fecha: '2026-08-21',
    clienteId: 'c1',
    clienteNombre: 'Constructora Andes',
    clienteDireccion: 'Av. Balmaceda 1240',
    clienteContacto: '+56 9 1234 5678',
    registradoPor: 'devops@cic.cl',
    items: [
      { productoId: '1', nombre: 'Pollo arvejado', precio: 4500, cantidad: 2, rol: 'fondo' },
      { productoId: '4', nombre: 'Ensalada chilena', precio: 1500, cantidad: 2, rol: 'ensalada' },
      { productoId: '9', nombre: 'Bebida lata 350cc', precio: 1200, cantidad: 2, rol: 'bebida' },
    ],
    total: 15700,
    tipoEntrega: 'delivery',
    deliveryCost: 1300,
    metodoPago: 'transferencia',
    estadoPago: 'pendiente',
    ...over,
  } as Pedido;
}

const pedidos: Pedido[] = [
  pedido({ id: 'p1', estado: 'creado' }),
  pedido({ id: 'p2', estado: 'creado', clienteNombre: 'Sofía Ramírez', total: 6300, tipoEntrega: 'retiro', deliveryCost: 0, metodoPago: 'efectivo', items: [{ productoId: '2', nombre: 'Carne mechada', precio: 5200, cantidad: 1, rol: 'fondo', agregado: 'puré', notas: 'sin sal' }] }),
  pedido({ id: 'p3', estado: 'pagado', clienteNombre: 'Taller Los Robles', estadoPago: 'pagado', total: 28400 }),
  pedido({ id: 'p4', estado: 'programado', clienteNombre: 'Municipalidad PH', estadoPago: 'pagado', total: 54200, estadoActualizadoPor: 'devops@cic.cl', estadoActualizadoEn: '2026-08-21T11:20:00.000Z' }),
  pedido({ id: 'p5', estado: 'entregando', clienteNombre: 'Colegio San Marcos', estadoPago: 'pagado', total: 91800 }),
  pedido({ id: 'p6', estado: 'entregado', clienteNombre: 'Clínica del Valle', estadoPago: 'pagado', total: 12600, estadoActualizadoPor: 'devops@cic.cl', estadoActualizadoEn: '2026-08-20T14:02:00.000Z' }),
  pedido({ id: 'p7', estado: 'cancelado', clienteNombre: null, estadoPago: 'pendiente', total: 4500 }),
];

const noop = () => {};

export function Preview() {
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <PageHeader
        titulo="Productos"
        descripcion="El catálogo, agrupado por categoría. Cada color viene del alimento: tomate, lechuga, choclo, betarraga, palta, agua."
        acciones={<button className="primary">Nuevo producto</button>}
      />
      <ProductoList productos={productos} loading={false} error={null} onEdit={noop} onDelete={noop} />

      <div style={{ height: 'var(--space-12)' }} />

      <PageHeader
        titulo="Pedidos"
        descripcion="Tablero por estado: cada pedido avanza de Creado a Entregado siguiendo las transiciones válidas."
        acciones={<button className="primary">Nuevo pedido</button>}
      />
      <PedidoList
        pedidos={pedidos}
        loading={false}
        error={null}
        onEdit={noop}
        onDelete={noop}
        onChangeEstado={noop}
        onConfirmarPago={noop}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
);
