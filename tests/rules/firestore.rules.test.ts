/**
 * Tests de las reglas de seguridad de Firestore (firestore.rules).
 *
 * Reproduce, contra el emulador, EXACTAMENTE las operaciones que ejecuta
 * cada pagina de la app (src/pages/*) a traves de src/api/*, para detectar
 * bloqueos por `permission-denied` antes de que aparezcan en produccion.
 *
 * Ejecutar: npm run test:rules
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

const ADMIN_EMAIL = 'admin@test.cl';
const OTRO_EMAIL = 'intruso@test.cl';

let testEnv: RulesTestEnvironment;

/** Firestore autenticado como el admin permitido. */
function asAdmin(): Firestore {
  return testEnv
    .authenticatedContext('uid-admin', { email: ADMIN_EMAIL, email_verified: true })
    .firestore() as unknown as Firestore;
}

/** Firestore autenticado con el mismo email pero en MAYUSCULAS (prueba `.lower()`). */
function asAdminMayus(): Firestore {
  return testEnv
    .authenticatedContext('uid-admin', { email: 'Admin@Test.CL', email_verified: true })
    .firestore() as unknown as Firestore;
}

/** Firestore autenticado con un email que NO esta en usuariosPermitidos. */
function asIntruso(): Firestore {
  return testEnv
    .authenticatedContext('uid-intruso', { email: OTRO_EMAIL, email_verified: true })
    .firestore() as unknown as Firestore;
}

/** Firestore sin autenticar. */
function asAnonimo(): Firestore {
  return testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
}

// --- Payloads que la app realmente escribe (ver src/api/*.ts) ---

const productoValido = {
  nombre: 'Pollo asado',
  descripcion: 'Con papas',
  precio: 4500,
  categoria: 'fondo',
  disponible: true,
};

const colacionValida = {
  nombre: 'Menu lunes',
  fecha: '2026-08-21',
  activa: false,
  creadoPor: ADMIN_EMAIL,
  items: [{ productoId: 'p1', rol: 'fondo', orden: 0 }],
};

const clienteValido = {
  direccion: 'av. siempre viva 742',
  contacto: '+56911111111',
  nombre: 'Ana',
};

const pedidoValido = {
  fecha: '2026-08-21',
  clienteId: 'c1',
  clienteNombre: 'Ana',
  clienteDireccion: 'av. siempre viva 742',
  clienteContacto: '+56911111111',
  registradoPor: ADMIN_EMAIL,
  colacionId: null,
  items: [
    { productoId: 'p1', nombre: 'Pollo asado', precio: 4500, cantidad: 1, rol: 'fondo' },
  ],
  total: 5800,
  estado: 'creado',
  tipoEntrega: 'delivery',
  deliveryCost: 1300,
  metodoPago: 'efectivo',
  estadoPago: 'pendiente',
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-colaciones',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Semilla: el admin autorizado + datos base que las paginas listan/editan.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'usuariosPermitidos', ADMIN_EMAIL), { agregadoPor: 'seed' });
    await setDoc(doc(db, 'productos', 'p1'), productoValido);
    await setDoc(doc(db, 'colaciones', 'col-activa'), { ...colacionValida, activa: true });
    await setDoc(doc(db, 'clientes', 'c1'), clienteValido);
    await setDoc(doc(db, 'pedidos', 'ped1'), pedidoValido);
    await setDoc(doc(db, 'pedidos', 'ped-finalizado'), { ...pedidoValido, estado: 'finalizado' });
  });
});

// =====================================================================
// Puerta de acceso - isAuthedAdmin()
// =====================================================================

describe('Acceso - allowlist usuariosPermitidos', () => {
  it('LoginPage: un usuario autenticado puede leer su propio doc de allowlist', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), 'usuariosPermitidos', ADMIN_EMAIL)));
  });

  it('LoginPage: un email no autorizado lee la allowlist y obtiene "no existe" (no un error)', async () => {
    const snap = await assertSucceeds(getDoc(doc(asIntruso(), 'usuariosPermitidos', OTRO_EMAIL)));
    expect(snap.exists()).toBe(false);
  });

  it('el email se normaliza a minusculas: "Admin@Test.CL" es reconocido como admin', async () => {
    await assertSucceeds(getDocs(collection(asAdminMayus(), 'productos')));
  });

  it('un email autenticado pero NO permitido queda bloqueado en todas las colecciones', async () => {
    const db = asIntruso();
    await assertFails(getDocs(collection(db, 'productos')));
    await assertFails(getDocs(collection(db, 'colaciones')));
    await assertFails(getDocs(collection(db, 'clientes')));
    await assertFails(getDocs(collection(db, 'pedidos')));
  });

  it('un usuario anonimo queda bloqueado en todo', async () => {
    const db = asAnonimo();
    await assertFails(getDocs(collection(db, 'productos')));
    await assertFails(getDoc(doc(db, 'usuariosPermitidos', ADMIN_EMAIL)));
  });
});

// =====================================================================
// ProductosPage
// =====================================================================

describe('ProductosPage', () => {
  it('lista productos (getProductos)', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'productos')));
  });

  it('lista productos paginados (getProductosPaginated: orderBy nombre + limit)', async () => {
    const db = asAdmin();
    await assertSucceeds(getDocs(query(collection(db, 'productos'), orderBy('nombre'), limit(50))));
  });

  it('crea un producto (createProducto)', async () => {
    await assertSucceeds(addDoc(collection(asAdmin(), 'productos'), productoValido));
  });

  it('edita un producto (updateProducto: setDoc completo)', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'productos', 'p1'), { ...productoValido, precio: 5000 }),
    );
  });

  it('elimina un producto (deleteProducto)', async () => {
    await assertSucceeds(deleteDoc(doc(asAdmin(), 'productos', 'p1')));
  });

  it('rechaza un producto con campo fuera del esquema', async () => {
    await assertFails(addDoc(collection(asAdmin(), 'productos'), { ...productoValido, stock: 5 }));
  });

  it('rechaza un producto con precio negativo', async () => {
    await assertFails(addDoc(collection(asAdmin(), 'productos'), { ...productoValido, precio: -1 }));
  });
});

// =====================================================================
// ClientesPage
// =====================================================================

describe('ClientesPage', () => {
  it('lista clientes (getClientes)', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'clientes')));
  });

  it('crea un cliente con nombre (createCliente)', async () => {
    await assertSucceeds(addDoc(collection(asAdmin(), 'clientes'), clienteValido));
  });

  it('crea un cliente sin nombre (nombre opcional)', async () => {
    await assertSucceeds(
      addDoc(collection(asAdmin(), 'clientes'), {
        direccion: 'los aromos 1',
        contacto: '+56922222222',
      }),
    );
  });

  it('crea un cliente con nombre null', async () => {
    await assertSucceeds(
      addDoc(collection(asAdmin(), 'clientes'), {
        direccion: 'los aromos 2',
        contacto: '+56933333333',
        nombre: null,
      }),
    );
  });

  it('edita un cliente (updateCliente: setDoc completo)', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'clientes', 'c1'), { ...clienteValido, nombre: 'Ana Maria' }),
    );
  });

  it('elimina un cliente (deleteCliente)', async () => {
    await assertSucceeds(deleteDoc(doc(asAdmin(), 'clientes', 'c1')));
  });

  it('findOrCreateCliente: query por direccion + contacto', async () => {
    const db = asAdmin();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'clientes'),
          where('direccion', '==', clienteValido.direccion),
          where('contacto', '==', clienteValido.contacto),
        ),
      ),
    );
  });
});

// =====================================================================
// ColacionesPage
// =====================================================================

describe('ColacionesPage', () => {
  it('lista colaciones (getColaciones)', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'colaciones')));
  });

  it('lista colaciones paginadas (orderBy fecha desc + limit)', async () => {
    const db = asAdmin();
    await assertSucceeds(
      getDocs(query(collection(db, 'colaciones'), orderBy('fecha', 'desc'), limit(50))),
    );
  });

  it('consulta la colacion activa (getColacionActiva: where activa == true)', async () => {
    const db = asAdmin();
    await assertSucceeds(getDocs(query(collection(db, 'colaciones'), where('activa', '==', true))));
  });

  it('crea una colacion no activa (createColacion, rama simple)', async () => {
    await assertSucceeds(addDoc(collection(asAdmin(), 'colaciones'), colacionValida));
  });

  it('crea una colacion ACTIVA (createColacion, rama batch: desactiva las demas + set)', async () => {
    const db = asAdmin();
    const activas = await getDocs(query(collection(db, 'colaciones'), where('activa', '==', true)));
    const batch = writeBatch(db);
    activas.docs.forEach((d) => batch.update(d.ref, { activa: false }));
    batch.set(doc(collection(db, 'colaciones')), { ...colacionValida, activa: true });
    await assertSucceeds(batch.commit());
  });

  it('activa una colacion existente (activarColacion: batch de updates parciales)', async () => {
    const db = asAdmin();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore() as unknown as Firestore, 'colaciones', 'col-otra'),
        colacionValida,
      );
    });
    const activas = await getDocs(query(collection(db, 'colaciones'), where('activa', '==', true)));
    const batch = writeBatch(db);
    activas.docs.forEach((d) => {
      if (d.id !== 'col-otra') batch.update(d.ref, { activa: false });
    });
    batch.update(doc(db, 'colaciones', 'col-otra'), { activa: true });
    await assertSucceeds(batch.commit());
  });

  it('edita una colacion (updateColacion: setDoc completo)', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'colaciones', 'col-activa'), {
        ...colacionValida,
        activa: true,
        nombre: 'Menu martes',
      }),
    );
  });

  it('elimina una colacion (deleteColacion)', async () => {
    await assertSucceeds(deleteDoc(doc(asAdmin(), 'colaciones', 'col-activa')));
  });

  it('DATOS LEGACY: activar una colacion con un campo fuera del esquema queda bloqueado', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'colaciones', 'col-legacy'), {
        ...colacionValida,
        precioTotal: 4500, // campo antiguo, no esta en el allowlist de las reglas
      });
    });
    await assertFails(updateDoc(doc(asAdmin(), 'colaciones', 'col-legacy'), { activa: true }));
  });
});

// =====================================================================
// PedidosPage
// =====================================================================

describe('PedidosPage', () => {
  it('lista pedidos (getPedidos)', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'pedidos')));
  });

  it('lista pedidos paginados (orderBy fecha desc + limit)', async () => {
    const db = asAdmin();
    await assertSucceeds(
      getDocs(query(collection(db, 'pedidos'), orderBy('fecha', 'desc'), limit(50))),
    );
  });

  it('verificarDireccionDuplicada: query por clienteDireccion + fecha', async () => {
    const db = asAdmin();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'pedidos'),
          where('clienteDireccion', '==', pedidoValido.clienteDireccion),
          where('fecha', '==', pedidoValido.fecha),
        ),
      ),
    );
  });

  it('crea un pedido (createPedido)', async () => {
    await assertSucceeds(addDoc(collection(asAdmin(), 'pedidos'), pedidoValido));
  });

  it('crea un pedido de retiro (deliveryCost 0)', async () => {
    await assertSucceeds(
      addDoc(collection(asAdmin(), 'pedidos'), {
        ...pedidoValido,
        tipoEntrega: 'retiro',
        deliveryCost: 0,
        total: 4500,
      }),
    );
  });

  it('edita un pedido no entregado (updatePedido: setDoc completo)', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), 'pedidos', 'ped1'), { ...pedidoValido, total: 5800 }),
    );
  });

  it('bloquea editar un pedido finalizado (Req 5)', async () => {
    await assertFails(
      setDoc(doc(asAdmin(), 'pedidos', 'ped-finalizado'), {
        ...pedidoValido,
        estado: 'finalizado',
        total: 9999,
      }),
    );
  });

  it('bloquea eliminar un pedido finalizado (Req 5)', async () => {
    await assertFails(deleteDoc(doc(asAdmin(), 'pedidos', 'ped-finalizado')));
  });

  it('elimina un pedido no entregado (deletePedido)', async () => {
    await assertSucceeds(deleteDoc(doc(asAdmin(), 'pedidos', 'ped1')));
  });

  it('cambiarEstadoPedido: updateDoc parcial + arrayUnion en historialEstados', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(), 'pedidos', 'ped1'), {
        estado: 'pagado',
        estadoActualizadoPor: ADMIN_EMAIL,
        estadoActualizadoEn: '2026-08-21T12:00:00.000Z',
        historialEstados: arrayUnion({
          estado: 'pagado',
          cambiadoPor: ADMIN_EMAIL,
          cambiadoEn: '2026-08-21T12:00:00.000Z',
        }),
      }),
    );
  });

  it('confirmarPago: updateDoc parcial que ademas sincroniza estadoPago', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(), 'pedidos', 'ped1'), {
        estado: 'pagado',
        estadoPago: 'pagado',
        estadoActualizadoPor: ADMIN_EMAIL,
        estadoActualizadoEn: '2026-08-21T12:00:00.000Z',
        historialEstados: arrayUnion({
          estado: 'pagado',
          cambiadoPor: ADMIN_EMAIL,
          cambiadoEn: '2026-08-21T12:00:00.000Z',
        }),
      }),
    );
  });

  it('DATOS LEGACY: cambiar el estado de un pedido sin los campos nuevos queda bloqueado', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const legacy: Record<string, unknown> = { ...pedidoValido };
      delete legacy.metodoPago;
      delete legacy.estadoPago;
      delete legacy.deliveryCost;
      await setDoc(doc(db, 'pedidos', 'ped-legacy'), legacy);
    });
    await assertFails(
      updateDoc(doc(asAdmin(), 'pedidos', 'ped-legacy'), {
        estado: 'pagado',
        estadoActualizadoPor: ADMIN_EMAIL,
        estadoActualizadoEn: '2026-08-21T12:00:00.000Z',
      }),
    );
  });

  it('rechaza un pedido con estado fuera del enum', async () => {
    await assertFails(
      addDoc(collection(asAdmin(), 'pedidos'), { ...pedidoValido, estado: 'en_camino' }),
    );
  });

  it('rechaza un pedido con estado legacy (programado)', async () => {
    await assertFails(
      addDoc(collection(asAdmin(), 'pedidos'), { ...pedidoValido, estado: 'programado' }),
    );
  });

  it('rechaza un pedido con estado legacy (entregado)', async () => {
    await assertFails(
      addDoc(collection(asAdmin(), 'pedidos'), { ...pedidoValido, estado: 'entregado' }),
    );
  });

  it('rechaza un pedido con metodoPago fuera del enum', async () => {
    await assertFails(
      addDoc(collection(asAdmin(), 'pedidos'), { ...pedidoValido, metodoPago: 'webpay' }),
    );
  });
});

// =====================================================================
// Colecciones no contempladas
// =====================================================================

describe('Bloqueo por defecto', () => {
  it('cualquier coleccion no declarada queda inaccesible incluso para el admin', async () => {
    await assertFails(getDocs(collection(asAdmin(), 'configuracion')));
    await assertFails(addDoc(collection(asAdmin(), 'configuracion'), { a: 1 }));
  });
});
