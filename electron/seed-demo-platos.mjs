/**
 * Platos de demostración: menús del día (ítems libres) y colaciones de valor
 * fijo, con foto, para evaluar las cards de la página Platos.
 *
 * Uso:
 *   npm run seed:demo
 *   node electron/seed-demo-platos.mjs [ruta-al-.db]
 *
 * Idempotente: los documentos demo llevan `demo: true` y se REEMPLAZAN en cada
 * corrida (no se duplican). Los platos creados a mano no se tocan.
 * Quedan activos ("disponible hoy") tres platos distintos: el dominio permite
 * varios activos a la vez.
 */
import { createDb } from './db.mjs';
import { seedProductosSiVacio } from './seed-data.mjs';

const dbPath =
  process.argv[2] ??
  (process.env.APPDATA ? `${process.env.APPDATA}/app-colaciones/colaciones.db` : ':memory:');

const db = createDb(dbPath);
try {
  const sembrados = seedProductosSiVacio(db);
  if (sembrados) console.log(`Catálogo sembrado: ${sembrados} productos`);

  const porNombre = new Map(db.list('productos').map((p) => [p.nombre, p.id]));
  const pid = (nombre) => {
    const id = porNombre.get(nombre);
    if (!id) throw new Error(`Producto no encontrado en el catálogo: "${nombre}"`);
    return id;
  };

  const it = (productoId, rol, nota) => {
    const item = { productoId, rol };
    if (nota) item.nota = nota;
    return item;
  };

  // --- Menús del día (tipo 'menu', con fecha, ítems variables) ---
  const MENUS = [
    {
      nombre: 'Cazuela de osobuco',
      foto: 'cazuela',
      activa: true,
      items: [
        it(pid('Cazuela de osobuco'), 'fondo', 'con hueso'),
        it(pid('Arroz'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Bebida 250 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Chuleta con papas',
      foto: 'chuleta',
      activa: true,
      items: [
        it(pid('Chuleta'), 'fondo', '+ huevo frito'),
        it(pid('Papas fritas'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Jugo del valle 400 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Tallarines al pesto',
      foto: 'pasta',
      items: [
        it(pid('Tallarines al pesto'), 'fondo'),
        it(pid('Guiso de zapallo italiano'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Bebida en lata 350 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Salmón a la mantequilla',
      foto: 'salmon',
      items: [
        it(pid('Salmón a la mantequilla'), 'fondo', 'al punto'),
        it(pid('Arroz'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Bebida 250 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Pescado apanado',
      foto: 'pescado',
      items: [
        it(pid('Pescado frito o apanado'), 'fondo'),
        it(pid('Papas fritas'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Crema de verduras'), 'extra', 'de entrada'),
      ],
    },
    {
      nombre: 'Carne mongoliana',
      foto: 'mongoliana',
      items: [
        it(pid('Carne Mongoliana'), 'fondo', 'con verduritas'),
        it(pid('Arroz'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Bebida en lata 350 ml'), 'extra'),
      ],
    },
  ];

  // --- Colaciones: sets predefinidos con valor fijo (tipo 'colacion') ---
  const COLACIONES = [
    {
      nombre: 'Colación clásica',
      foto: 'costillar',
      valor: 6500,
      activa: true,
      items: [
        it(pid('Cazuela de asado de tira'), 'fondo', 'bien cocido'),
        it(pid('Arroz'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Bebida 250 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Colación ejecutiva',
      foto: 'carne',
      valor: 7000,
      items: [
        it(pid('Carne a la olla con champiñones'), 'fondo'),
        it(pid('Puré'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Bebida 250 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Colación vegetariana',
      foto: 'vegetariano',
      valor: 6000,
      items: [
        it(pid('Tallarines al pesto'), 'fondo', 'sin queso'),
        it(pid('Guiso de zapallo italiano'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Jugo del valle 400 ml'), 'extra'),
      ],
    },
    {
      nombre: 'Colación pollo',
      foto: 'pollo',
      valor: 6200,
      items: [
        it(pid('Bistec de pollo'), 'fondo'),
        it(pid('Papas fritas'), 'agregado'),
        it(pid('Ensalada surtida'), 'ensalada'),
        it(pid('Crema de verduras'), 'extra', 'de entrada'),
      ],
    },
  ];

  // Fechas de los menús: un activo hoy, otro ayer, el resto programados.
  const OFFSETS_MENU = [0, -1, 1, 2, 4, 6];
  const isoConOffset = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  const ops = [];
  // Reemplaza los demos anteriores sin tocar los platos creados a mano.
  for (const viejo of db.find('platos', { demo: true })) {
    ops.push({ type: 'remove', col: 'platos', id: viejo.id });
  }
  // "Disponible hoy" permite varios activos; solo desactiva los demos viejos
  // (los platos manuales conservan su estado).
  for (const m of MENUS) {
    ops.push({
      type: 'insert',
      col: 'platos',
      data: {
        nombre: m.nombre,
        tipo: 'menu',
        fecha: isoConOffset(OFFSETS_MENU[MENUS.indexOf(m)]),
        activa: Boolean(m.activa),
        creadoPor: 'demo',
        foto: m.foto,
        demo: true,
        items: m.items.map((x, i) => ({ ...x, orden: i + 1 })),
      },
    });
  }
  for (const c of COLACIONES) {
    ops.push({
      type: 'insert',
      col: 'platos',
      data: {
        nombre: c.nombre,
        tipo: 'colacion',
        valor: c.valor,
        activa: Boolean(c.activa),
        creadoPor: 'demo',
        foto: c.foto,
        demo: true,
        items: c.items.map((x, i) => ({ ...x, orden: i + 1 })),
      },
    });
  }
  db.tx(ops);

  console.log(`Seed demo en ${dbPath}`);
  for (const p of db.list('platos', { orderBy: 'nombre' })) {
    console.log(
      ` ${p.activa ? '[HOY]' : '     '} ${p.tipo.padEnd(8)} ${p.nombre.padEnd(26)}` +
        `${p.fecha ? ` ${p.fecha}` : ` $${p.valor}`}  foto=${p.foto}`,
    );
  }
} finally {
  db.close();
}
