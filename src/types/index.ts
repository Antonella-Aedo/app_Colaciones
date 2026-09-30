// Tipos compartidos — fuente de verdad del contrato de datos.
// Colecciones: productos, platos, pedidos, clientes, usuariosPermitidos.

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

// === Platos (menú del día variable o colación de valor predeterminado) ===

export type RolItem = 'fondo' | 'agregado' | 'ensalada' | 'extra';

/** 'menu' = ítems libres y valor variable; 'colacion' = set predefinido con precio fijo. */
export type TipoPlato = 'menu' | 'colacion';

export interface PlatoItem {
  productoId: string;   // referencia a producto del catálogo
  rol: RolItem;
  orden: number;
  nota?: string;
}

export interface Plato {
  id: string;
  nombre: string;
  tipo: TipoPlato;
  fecha?: string;       // ISO yyyy-MM-dd — menús del día; opcional en colaciones
  activa: boolean;      // disponible hoy (varios platos pueden estarlo a la vez)
  valor?: number;       // precio fijo — obligatorio cuando tipo === 'colacion'
  creadoPor: string;
  items: PlatoItem[];
  foto?: string;        // clave en MENU_FOTOS (src/assets/menuFotos.ts) o data URL subida por el usuario
}

export type PlatoInput = Omit<Plato, 'id'>;

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
  | 'finalizado'
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
  platoId?: string | null;     // referencia a plato precargado (null si desde cero)
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
