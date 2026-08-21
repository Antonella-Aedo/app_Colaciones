// Tipos compartidos — fuente de verdad del contrato con Firestore.
// Colecciones: productos, colaciones, pedidos.

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

// === Pedidos ===

export type EstadoPedido = 'pendiente' | 'entregado' | 'cancelado';

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
  cliente: string;
  registradoPor: string;
  colacionId?: string | null;  // referencia a colación precargada (null si desde cero)
  items: PedidoItem[];
  total: number;
  estado: EstadoPedido;
}

export type PedidoInput = Omit<Pedido, 'id' | 'estado'>;
