/**
 * Seed inicial del catálogo de productos en Firestore.
 * Ejecutar una sola vez: npx tsx scripts/seed-productos.ts
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'app-colaciones-506203',
  appId: '1:313826246588:web:3e41b0becad24f089475b9',
  storageBucket: 'app-colaciones-506203.firebasestorage.app',
<<<<<<< HEAD
  apiKey: 'AIzaSyBybGzGns8SEkuD5ha_v24NC3m_nBThC7M',
=======
  apiKey: '***REDACTED***',
>>>>>>> 44227fd (feat: migracion a Firebase Firestore + deploy a Firebase Hosting)
  authDomain: 'app-colaciones-506203.firebaseapp.com',
  messagingSenderId: '313826246588',
};

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
