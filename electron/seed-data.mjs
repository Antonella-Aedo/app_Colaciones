/**
 * Catálogo inicial de productos. Se inserta automáticamente en el primer
 * arranque de la app (cuando la colección `productos` está vacía).
 * Mismo listado que el antiguo scripts/seed-productos.ts (Firestore).
 */
export const PRODUCTOS_SEED = [
  // Bebidas
  { nombre: 'Bebida en lata 350 ml', descripcion: 'Fanta', precio: 1200, categoria: 'bebida', disponible: true },
  { nombre: 'Bebida 250 ml', descripcion: 'Coca-Cola', precio: 800, categoria: 'bebida', disponible: true },
  { nombre: 'Jugo del valle 400 ml', descripcion: 'piña', precio: 1400, categoria: 'bebida', disponible: true },
  // Crema / sopa
  { nombre: 'Crema de verduras', descripcion: '', precio: 1200, categoria: 'crema', disponible: true },
  // Fondos
  { nombre: 'Cazuela de osobuco', descripcion: '+ ensalada surtida', precio: 6800, categoria: 'fondo', disponible: true },
  { nombre: 'Cazuela de asado de tira', descripcion: '+ ensalada surtida', precio: 6800, categoria: 'fondo', disponible: true },
  { nombre: 'Tallarines al pesto', descripcion: '+ pescado frito o chuleta o bistec de pollo o carne a la olla + ensalada surtida', precio: 6800, categoria: 'fondo', disponible: true },
  { nombre: 'Chuleta', descripcion: '+ arroz + huevo frito + guiso de zapallo italiano o papas fritas + ensaladas', precio: 6800, categoria: 'fondo', disponible: true },
  { nombre: 'Pescado frito o apanado', descripcion: '+ arroz + guiso de zapallo italiano o papas fritas + ensalada surtida', precio: 6500, categoria: 'fondo', disponible: true },
  { nombre: 'Carne a la olla con champiñones', descripcion: '+ arroz + guiso de zapallo italiano o papas fritas + ensalada surtida', precio: 6500, categoria: 'fondo', disponible: true },
  { nombre: 'Bistec de pollo', descripcion: '+ arroz + papas fritas o guiso de zapallo italiano + ensalada surtida', precio: 6500, categoria: 'fondo', disponible: true },
  { nombre: 'Carne Mongoliana', descripcion: '+ arroz + papas fritas o guiso de zapallo italiano + ensalada surtida', precio: 6500, categoria: 'fondo', disponible: true },
  { nombre: 'Salmón a la mantequilla', descripcion: '+ arroz + guiso de zapallo italiano o papas fritas + ensalada surtida', precio: 7500, categoria: 'fondo', disponible: true },
  { nombre: 'Reineta a la mantequilla', descripcion: '+ arroz + papas fritas o guiso de zapallo italiano + ensalada surtida', precio: 7000, categoria: 'fondo', disponible: true },
  // Agregados (precio 0, incluidos en el fondo)
  { nombre: 'Arroz', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  { nombre: 'Puré', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  { nombre: 'Papas fritas', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  { nombre: 'Guiso de zapallo italiano', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  // Ensaladas
  { nombre: 'Ensalada surtida', descripcion: '', precio: 0, categoria: 'ensalada', disponible: true },
];

/** Inserta el catálogo inicial si la colección está vacía (primer arranque). */
export function seedProductosSiVacio(db) {
  if (db.count('productos') > 0) return 0;
  for (const p of PRODUCTOS_SEED) db.insert('productos', p);
  return PRODUCTOS_SEED.length;
}
