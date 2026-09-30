// Esquemas de validación runtime (Zod) para la capa de API.
// Estos espejan los tipos de `src/types/index.ts` pero añaden reglas de
// validación en tiempo de ejecución: los tipos de TypeScript solo existen
// en compilación y no protegen contra datos arbitrarios en runtime.
// Toda escritura a la base local (SQLite vía window.colaciones) pasa por estos
// esquemas antes de persistir.

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

// === Platos (menú del día variable o colación de valor predeterminado) ===

export const RolItemSchema = z.enum(['fondo', 'agregado', 'ensalada', 'extra']);

export const TipoPlatoSchema = z.enum(['menu', 'colacion']);

export const PlatoItemSchema = z.object({
  productoId: z.string().min(1, 'productoId es requerido'),
  rol: RolItemSchema,
  orden: z.number().min(0, 'orden debe ser >= 0'),
  nota: z.string().optional(),
});

const PlatoBase = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1, 'nombre es requerido'),
  tipo: TipoPlatoSchema,
  fecha: z.string().min(1, 'fecha es requerida').optional(),
  activa: z.boolean(),
  valor: z.number().min(0, 'valor debe ser >= 0').optional(),
  // Opcional: la UI lo presenta sin asterisco y sin validacion, asi que un
  // valor vacio NO debe bloquear el guardado. Se persiste como '' (las
  // reglas solo exigen que sea string).
  creadoPor: z.string(),
  items: z.array(PlatoItemSchema).min(1, 'items debe tener al menos un elemento'),
  foto: z.string().optional(),
});

// Reglas cruzadas: colación = set de valor predeterminado (precio fijo
// obligatorio); menú = oferta variable del día (fecha obligatoria).
// Se tipa con la forma mínima para que sirva en PlatoSchema y PlatoInputSchema.
const reglasPlato = (
  p: { tipo: string; fecha?: string; valor?: number },
  ctx: z.RefinementCtx,
) => {
  if (p.tipo === 'colacion' && (p.valor === undefined || p.valor <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valor'],
      message: 'una colación requiere un valor predeterminado (> 0)',
    });
  }
  if (p.tipo === 'menu' && !p.fecha) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fecha'],
      message: 'un menú requiere fecha',
    });
  }
};

export const PlatoSchema = PlatoBase.superRefine(reglasPlato);

// PlatoInput = Omit<Plato, 'id'>
export const PlatoInputSchema = PlatoBase.omit({ id: true }).superRefine(reglasPlato);

// === Clientes ===

export const ClienteSchema = z.object({
  id: z.string().min(1),
  direccion: z.string().min(1, 'direccion es requerida'),
  contacto: z.string().min(1, 'contacto es requerido'),
  nombre: z.string().nullable().optional(),
});

export const ClienteInputSchema = ClienteSchema.omit({ id: true });

// === Pedidos ===

export const EstadoPedidoSchema = z.enum([
  'creado',
  'pagado',
  'finalizado',
  'cancelado',
]);

export const TipoEntregaSchema = z.enum(['delivery', 'retiro']);

export const MetodoPagoSchema = z.enum(['efectivo', 'tarjeta', 'transferencia']);

export const EstadoPagoSchema = z.enum(['pendiente', 'pagado']);

export const CambioEstadoSchema = z.object({
  estado: EstadoPedidoSchema,
  cambiadoPor: z.string().min(1),
  cambiadoEn: z.string().min(1),
});

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
  // clienteId puede ser '' cuando el usuario elige NO guardar el cliente en el
  // catálogo: el pedido vive solo con sus snapshots (clienteDireccion, etc.).
  clienteId: z.string(),
  clienteNombre: z.string().nullable(),
  clienteDireccion: z.string().min(1, 'clienteDireccion es requerido'),
  clienteContacto: z.string().min(1, 'clienteContacto es requerido'),
  // Opcional, mismo criterio que Plato.creadoPor: vacio se guarda como ''.
  registradoPor: z.string(),
  platoId: z.string().nullable(),
  items: z.array(PedidoItemSchema).min(1, 'items debe tener al menos un elemento'),
  total: z.number().min(0, 'total debe ser >= 0'),
  estado: EstadoPedidoSchema,
  tipoEntrega: TipoEntregaSchema,
  deliveryCost: z.number().min(0, 'deliveryCost debe ser >= 0'),
  metodoPago: MetodoPagoSchema,
  estadoPago: EstadoPagoSchema,
  // Campos de auditoría opcionales (no presentes en create, sí en update/cambiarEstado)
  estadoActualizadoPor: z.string().optional(),
  estadoActualizadoEn: z.string().optional(),
  historialEstados: z.array(CambioEstadoSchema).optional(),
});

// PedidoInput = Omit<Pedido, 'id' | 'estado' | 'estadoActualizadoPor' | 'estadoActualizadoEn' | 'historialEstados'>
//   & { estado?: EstadoPedido }
// estado es opcional en el input (createPedido lo defaultea a 'creado',
// updatePedido preserva el estado existente si no se provee).
// Los campos de auditoría NO van en el input (se gestionan via cambiarEstadoPedido).
export const PedidoInputSchema = PedidoSchema.omit({
  id: true,
  estado: true,
}).extend({
  estado: EstadoPedidoSchema.optional(),
});
