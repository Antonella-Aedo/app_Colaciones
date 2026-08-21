/**
 * Seed inicial del catálogo de productos en Firestore.
 * Ejecutar una sola vez: npx tsx scripts/seed-productos.ts
 *
 * Requiere Node 20.6+ (usa process.loadEnvFile para leer .env).
 * El config de Firebase se carga desde VITE_FIREBASE_CONFIG (igual que src/firebase/config.ts),
 * NUNCA debe ir hardcodeado en este archivo.
 */
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, collection, addDoc, writeBatch, doc } from 'firebase/firestore';

// Carga variables de .env cuando el script se ejecuta fuera de Vite (Node >= 20.6).
// Si no existe .env, se ignora silenciosamente; la validación de abajo fallará con un mensaje claro.
try {
  process.loadEnvFile();
} catch {
  // .env ausente o no soportado: se continúa, el error se lanza abajo si falta la variable.
}

function getConfig(): FirebaseOptions {
  const raw = process.env.VITE_FIREBASE_CONFIG as string | undefined;
  if (!raw) {
    throw new Error(
      'VITE_FIREBASE_CONFIG no está definida. Copia .env.example a .env y configura Firebase.',
    );
  }
  try {
    return JSON.parse(raw) as FirebaseOptions;
  } catch {
    throw new Error('VITE_FIREBASE_CONFIG no es JSON válido. Debe ser un objeto JSON serializado.');
  }
}

const firebaseConfig = getConfig();

interface ProductoSeed {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible: boolean;
}

const productos: ProductoSeed[] = [
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
  { nombre: 'Reineta a la mantequilla', descripcion: '+ arroz + guiso de zapallo italiano o papas fritas + ensalada surtida', precio: 7000, categoria: 'fondo', disponible: true },
  // Agregados (precio 0, incluidos en el fondo)
  { nombre: 'Arroz', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  { nombre: 'Puré', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  { nombre: 'Papas fritas', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  { nombre: 'Guiso de zapallo italiano', descripcion: 'agregado', precio: 0, categoria: 'agregado', disponible: true },
  // Ensaladas
  { nombre: 'Ensalada surtida', descripcion: '', precio: 0, categoria: 'ensalada', disponible: true },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const batch = writeBatch(db);
  for (const p of productos) {
    const ref = doc(collection(db, 'productos'));
    batch.set(ref, p);
  }
  await batch.commit();
  console.log(`OK: ${productos.length} productos insertados en Firestore.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
