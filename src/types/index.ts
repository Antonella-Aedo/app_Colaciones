// Tipos compartidos — fuente de verdad del contrato con Firestore.
// Colecciones: productos, colaciones, pedidos, clientes, usuariosPermitidos.

// === Productos (catálogo) ===

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;   // 'fondo' | 'ensalada' | 'agregado' | 'bebida' | 'crema' | custom
  disponible: boolean;
}

export type ProductoInput = Omit<Producto, 'id'>;

// === Colaciones (plato compuesto / menú del día) ===

export type RolItem = 'fondo' | 'agregado' | 'ensalada' | 'extra';

export interface ColacionItem {
  productoId: string;   // referencia a producto del catálogo
  rol: RolItem;
  orden: number;
  nota?: string;
}

export interface Colacion {
  id: string;
  nombre: string;
  fecha: string;        // ISO yyyy-MM-dd
  activa: boolean;      // menú del día activo (solo una a la vez)
  creadoPor: string;
  items: ColacionItem[];
}

export type ColacionInput = Omit<Colacion, 'id'>;

// === Clientes ===

export interface Cliente {
  id: string;
  direccion: string;     // obligatorio
  contacto: string;      // número de contacto, obligatorio
  nombre?: string | null; // opcional
}

export type ClienteInput = Omit<Cliente, 'id'>;

// === Pedidos ===

export type EstadoPedido =
  | 'creado'
  | 'pagado'
  | 'programado'
  | 'entregando'
  | 'entregado'
  | 'cancelado';

export type TipoEntrega = 'delivery' | 'retiro';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export type EstadoPago = 'pendiente' | 'pagado';

export interface CambioEstado {
  estado: EstadoPedido;
  cambiadoPor: string;   // email del usuario que cambió el estado
  cambiadoEn: string;    // ISO timestamp
}

export interface PedidoItem {
  productoId: string;
  nombre: string;       // snapshot
  precio: number;       // snapshot
  cantidad: number;
  rol: RolItem | 'bebida' | 'crema';
  agregado?: string;    // nombre del agregado opcional
  ensalada?: string;    // tipo de ensalada opcional
  notas?: string;       // notas libres
}

export interface Pedido {
  id: string;
  fecha: string;        // ISO yyyy-MM-dd
  clienteId: string;             // referencia a colección clientes
  clienteNombre: string | null;  // snapshot opcional
  clienteDireccion: string;      // snapshot (para aviso de dirección duplicada)
  clienteContacto: string;       // snapshot
  registradoPor: string;
  colacionId?: string | null;  // referencia a colación precargada (null si desde cero)
  items: PedidoItem[];
  total: number;          // Σ(precio×cantidad) + deliveryCost
  estado: EstadoPedido;
  // Entrega
  tipoEntrega: TipoEntrega;
  deliveryCost: number;   // 0 | DELIVERY_COST
  // Pago
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;  // fuente de verdad del pago
  // Auditoría de cambios de estado
  estadoActualizadoPor?: string;   // email del último cambio
  estadoActualizadoEn?: string;    // ISO timestamp
  historialEstados?: CambioEstado[];
}

export type PedidoInput = Omit<Pedido, 'id' | 'estado' | 'estadoActualizadoPor' | 'estadoActualizadoEn' | 'historialEstados'> & {
  estado?: EstadoPedido;
};
