// Esquemas de validación runtime (Zod) para la capa de API.
// Estos espejan los tipos de `src/types/index.ts` pero añaden reglas de
// validación en tiempo de ejecución: los tipos de TypeScript solo existen
// en compilación y no protegen contra datos arbitrarios en runtime.
// Toda escritura a Firestore pasa por estos esquemas antes de persistir.

import { z } from 'zod';

// === Productos (catálogo) ===

export const ProductoSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1, 'nombre es requerido'),
  descripcion: z.string(),
  precio: z.number().min(0, 'precio debe ser >= 0'),
  categoria: z.string().min(1, 'categoria es requerida'),
  disponible: z.boolean(),
});

// ProductoInput = Omit<Producto, 'id'>
export const ProductoInputSchema = ProductoSchema.omit({ id: true });

// === Colaciones (plato compuesto / menú del día) ===

export const RolItemSchema = z.enum(['fondo', 'agregado', 'ensalada', 'extra']);

export const ColacionItemSchema = z.object({
  productoId: z.string().min(1, 'productoId es requerido'),
  rol: RolItemSchema,
  orden: z.number().min(0, 'orden debe ser >= 0'),
  nota: z.string().optional(),
});

export const ColacionSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1, 'nombre es requerido'),
  fecha: z.string().min(1, 'fecha es requerida'),
  activa: z.boolean(),
  creadoPor: z.string().min(1, 'creadoPor es requerido'),
  items: z.array(ColacionItemSchema).min(1, 'items debe tener al menos un elemento'),
});

// ColacionInput = Omit<Colacion, 'id'>
export const ColacionInputSchema = ColacionSchema.omit({ id: true });

// === Pedidos ===

export const EstadoPedidoSchema = z.enum(['pendiente', 'entregado', 'cancelado']);

// rol de PedidoItem admite los roles de colación + 'bebida' | 'crema'
export const PedidoItemRolSchema = z.enum([
  'fondo',
  'agregado',
  'ensalada',
  'extra',
  'bebida',
  'crema',
]);

export const PedidoItemSchema = z.object({
  productoId: z.string().min(1, 'productoId es requerido'),
  nombre: z.string().min(1, 'nombre es requerido'),
  precio: z.number().min(0, 'precio debe ser >= 0'),
  cantidad: z.number().min(1, 'cantidad debe ser >= 1'),
  rol: PedidoItemRolSchema,
  agregado: z.string().optional(),
  ensalada: z.string().optional(),
  notas: z.string().optional(),
});

export const PedidoSchema = z.object({
  id: z.string().min(1),
  fecha: z.string().min(1, 'fecha es requerida'),
  cliente: z.string().min(1, 'cliente es requerido'),
  registradoPor: z.string().min(1, 'registradoPor es requerido'),
  colacionId: z.string().nullable(),
  items: z.array(PedidoItemSchema).min(1, 'items debe tener al menos un elemento'),
  total: z.number().min(0, 'total debe ser >= 0'),
  estado: EstadoPedidoSchema,
});

// PedidoInput = Omit<Pedido, 'id' | 'estado'> & { estado?: EstadoPedido }
// estado es opcional en el input (createPedido lo defaultea a 'pendiente',
// updatePedido preserva el estado existente si no se provee).
export const PedidoInputSchema = PedidoSchema.omit({ id: true, estado: true }).extend({
  estado: EstadoPedidoSchema.optional(),
});
