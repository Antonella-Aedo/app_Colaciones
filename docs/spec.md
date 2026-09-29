# Spec: app_Colaciones

## Objective

Aplicación web frontend para la gestión de colaciones alimentarias (menú del día + pedidos). Permite:

- Administrar un **catálogo de productos** (CRUD) organizados por categoría.
- Armar/editar **colaciones** (platos compuestos: fondo + agregado + ensalada + N extras) y marcar una como **menú del día activo** (favorito).
- **Registrar pedidos** precargando una colación existente (editable) o creando desde cero, con personalizaciones y atribución al usuario que registra.
- Listar pedidos y ver detalle.

Los datos persisten en una **base de datos local SQLite** (better-sqlite3 usado como document store) dentro de una app de escritorio **Electron**. Sin servicios externos: al abrir el programa la DB se inicializa sola en `%APPDATA%\app-colaciones\colaciones.db`. Se conserva el backend legacy de Apps Script + Google Sheets como referencia no activa.

**Usuario objetivo:** administrador de un servicio de colaciones que necesita publicar el menú del día y registrar pedidos.

**Criterios de éxito:**
- El administrador puede crear, listar, editar y eliminar productos del catálogo.
- El administrador puede armar colaciones (platos compuestos) seleccionando productos del catálogo con roles (fondo, agregado, ensalada, extra), con N extras sin límite.
- El administrador puede marcar una colación como "menú del día activo" (solo una activa a la vez).
- El administrador puede registrar pedidos **precargando una colación** (y editando los items) o **desde cero**, con cantidad, agregado, ensalada, notas, atribuyendo a un usuario (campo texto).
- El administrador puede listar pedidos y ver detalle.
- Los cambios se reflejan en la base de datos local (verificable en `colaciones.db`).
- La interfaz es responsiva y está en español.

## Modelo de dominio (normalizado — 1FN/2FN/3FN)

### Productos (catálogo)

Catálogo de items atómicos. Cada producto tiene una categoría.

```
id: string (uuid generado por la capa de DB)
nombre: string
descripcion: string
precio: number
categoria: string       // 'fondo' | 'ensalada' | 'agregado' | 'bebida' | 'crema' | custom
disponible: boolean
```

Colección (document store): `productos`

### Colaciones (plato compuesto / menú)

Cabecera de un plato compuesto. Una colación referencia N productos del catálogo con un rol. Solo una colación puede estar `activa` (menú del día) a la vez.

```
id: string (uuid)
nombre: string
fecha: string           // ISO yyyy-MM-dd
activa: boolean         // menú del día activo (favorito). Solo una true a la vez.
creadoPor: string       // usuario que armó la colación (campo texto)
items: ColacionItem[]   // array de objetos embebido en el documento JSON
```

**ColacionItem** (detalle N:M, embebido como array en el documento):

```
productoId: string      // referencia a producto del catálogo
rol: string             // 'fondo' | 'agregado' | 'ensalada' | 'extra'
orden: number           // posición dentro de la colación
nota?: string           // nota opcional
```

Colección: `colaciones`

**Regla de negocio:** al marcar una colación como `activa`, se desactivan las demás (transacción SQLite: `tx` con updates + write atómicos).

### Pedidos

Pedido registrado. Puede precargar una colación o crearse desde cero.

```
id: string (uuid)
fecha: string           // ISO yyyy-MM-dd
clienteId: string       // ref a clientes ('' si no se guardó)
clienteNombre: string | null
clienteDireccion: string
clienteContacto: string
registradoPor: string   // usuario que registra (campo texto)
colacionId?: string     // referencia opcional a la colación precargada (null si desde cero)
items: PedidoItem[]     // array embebido
total: number           // Σ precio × cantidad + deliveryCost
estado: string          // 'creado' | 'pagado' | 'finalizado' | 'cancelado'
tipoEntrega: 'delivery' | 'retiro'
deliveryCost: number    // 0 | 1300
metodoPago: 'efectivo' | 'tarjeta' | 'transferencia'
estadoPago: 'pendiente' | 'pagado'
historialEstados: CambioEstado[]  // auditoría
```

**PedidoItem** (detalle, embebido):

```
productoId: string
nombre: string          // snapshot del nombre al momento del pedido
precio: number          // snapshot del precio al momento del pedido
cantidad: number
rol: string             // 'fondo' | 'agregado' | 'ensalada' | 'extra' | 'bebida' | 'crema'
agregado?: string       // agregado opcional (nombre del producto agregado)
ensalada?: string       // ensalada opcional
notas?: string          // notas libres
```

Colección: `pedidos`

### Reglas de agregados

- Los agregados son productos del catálogo con `categoria = 'agregado'`.
- En una colación, el rol `agregado` aparece una vez (1 agregado por fondo).
- En un pedido, el item de tipo fondo puede llevar 1 agregado opcional.
- El precio del fondo **incluye** el agregado + ensalada base (no suma costo).
- Extras (rol `extra`) son items adicionales que se cobran aparte.

### Reglas de precio

- Fondo: precio incluye ensalada + 1 agregado.
- Ensalada, agregado, bebida, crema, extra: precio individual, se suman al total.
- El `total` del pedido = Σ (item.precio × item.cantidad).

## Tech Stack

- **App:** Electron 44 — proceso principal `electron/main.cjs` (CJS), preload `electron/preload.cjs`
- **Base de datos:** SQLite vía `better-sqlite3` 13 (`electron/db.mjs`) usado como document store — una tabla por colección `(id, data JSON)`, filtros con `json_extract`. Archivo: `%APPDATA%\app-colaciones\colaciones.db`, se crea y siembra solo al arrancar.
- **Puente DB:** IPC `db:invoke` → `window.colaciones.invoke(op, ...args)` (whitelist de ops en main)
- **Frontend:** React 18 + Vite 5 (TypeScript), `base: './'` + `HashRouter` (requerido bajo `file://`)
- **Estilos:** CSS Modules (sin framework de UI en el MVP)
- **Auth:** local — email contra colección `usuariosPermitidos`; el primer usuario se auto-registra (bootstrap de app local)
- **Empaquetado:** `electron-builder` → `release/Colaciones-Setup-*.exe` (NSIS) + `Colaciones-portable.exe`
- **Tests:** Vitest + React Testing Library; la capa api/hooks corre contra SQLite `:memory:` real (`tests/helpers/testDb.ts`)
- **Lint:** ESLint (config base de Vite)
- **Legacy (no activo):** Apps Script + Google Sheets (código conservado en `apps-script/`)

## Commands

```bash
npm install
npm run dev              # desarrollo: vite + electron (hot-reload, DB real)
npm run app              # build + abrir la app de escritorio
npm run build            # build producción (tsc -b && vite build)
npm run dist             # empaquetar: instalador NSIS + exe portable en release/
npm run pack             # empaquetar sin comprimir (prueba rápida)
npm run lint             # ESLint
npm test                 # tests (vitest run)
npm run test:coverage    # tests con cobertura
```

## Project Structure

```
app_Colaciones/
├── docs/spec.md
├── tasks/
├── apps-script/             → Legacy (no activo)
├── electron/
│   ├── main.cjs             → Proceso principal: ventana, DB, IPC
│   ├── preload.cjs          → window.colaciones (contextBridge)
│   ├── db.mjs               → Document store SQLite (compartido con tests)
│   ├── db.d.mts             → Tipos de db.mjs
│   └── seed-data.mjs        → Catálogo inicial (19 productos)
├── src/
│   ├── main.tsx             → HashRouter (requerido por file://)
│   ├── App.tsx
│   ├── auth/
│   │   └── AuthProvider.tsx → Sesión local + usuariosPermitidos
│   ├── api/
│   │   ├── clientDb.ts      → Puente window.colaciones → IPC
│   │   ├── schemas.ts       → Validación Zod (se conserva)
│   │   ├── productos.ts     → CRUD productos
│   │   ├── colaciones.ts    → CRUD colaciones + activar menú del día (tx)
│   │   ├── pedidos.ts       → CRUD pedidos + estados + auditoría
│   │   └── clientes.ts      → CRUD clientes + findOrCreate
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── ProductoForm.tsx / ProductoList.tsx
│   │   ├── ColacionForm.tsx → Editor de colación (plato compuesto)
│   │   ├── ColacionList.tsx
│   │   ├── PedidoForm.tsx   → Pedido con precarga de colación
│   │   ├── PedidoList.tsx / PedidoTabla / PedidoTablero / PedidoFiltros
│   │   ├── ClienteForm.tsx / ClienteList.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/
│   │   ├── useProductos.ts / useColaciones.ts / usePedidos.ts / useClientes.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
├── tests/
│   ├── helpers/testDb.ts    → SQLite :memory: real detrás de window.colaciones
│   ├── api/ hooks/ components/ utils/
└── package.json             → "main": electron/main.cjs, sección "build" (electron-builder)
```

## Code Style

- TypeScript estricto, sin `any`.
- Componentes funcionales con hooks; sin class components.
- Nombres de componentes en PascalCase; hooks prefijados con `use`.
- Funciones API en minúsculas y verbos (`getProductos`, `createColacion`).
- Un archivo por componente; CSS Modules junto al componente.
- La capa `src/api/` NO conoce SQLite: solo habla con `window.colaciones` (IPC).
  La lógica de negocio (Zod, totales, transiciones de estado) vive en `src/api/`;
  el proceso principal solo ejecuta ops primitivas (`list/get/find/insert/replace/update/remove/tx`).

```ts
// Ejemplo: acceso a datos desde src/api
import { dbInvoke } from './clientDb';

export async function getProductos(): Promise<Producto[]> {
  return dbInvoke<Producto[]>('list', 'productos', { orderBy: 'nombre' });
}
```

## Testing Strategy

- **Framework:** Vitest + React Testing Library.
- **Ubicación:** `tests/` para tests de API/lógica; `tests/components/` para UI.
- **DB real en tests:** `tests/helpers/testDb.ts` instala `electron/db.mjs` con SQLite `:memory:` detrás de `window.colaciones` — los tests ejercen la capa de persistencia real, no un mock.
- **Cobertura:** capa `api/` (CRUD de productos, colaciones, pedidos) con tests unitarios.
- **Niveles:**
  - Unitarios: `api/*`, hooks.
  - Componentes: render y eventos de formularios (incluye validación de reglas de agregados, precarga de colación).
  - E2E: fuera del alcance del MVP.

## Boundaries

- **Always:** Ejecutar `npm test` antes de commits. Validar inputs. Tipar todo con TS estricto. Snapshot de nombre/precio en items de pedido. Usar `tx` (transacción SQLite) para activar/desactivar colaciones.
- **Ask first:** Añadir nuevas dependencias. Cambiar el esquema/ubicación de la DB local. Cambiar el modelo de auth local.
- **Never:** Reintroducir dependencias de Firebase/servicios externos. Eliminar tests sin aprobación. Usar `any`. Eliminar el código legacy de Apps Script (se conserva). Commitear archivos `.db` (ver `.gitignore`).

## Success Criteria

- [ ] `npm run dev` levanta vite + la ventana Electron sin errores; `electron .` abre la app y crea/siembra `colaciones.db` sola.
- [ ] Pantalla de Productos: CRUD funciona contra la DB local.
- [ ] Pantalla de Colaciones: armar colación con productos del catálogo (roles fondo/agregado/ensalada/extra), N extras, marcar como activa (menú del día).
- [ ] Solo una colación activa a la vez (transacción `tx`).
- [ ] Pantalla de Pedidos: crear **precargando una colación** (editable) o **desde cero**, con personalizaciones y registradoPor.
- [ ] Total del pedido calculado correctamente.
- [ ] Los datos persisten en `colaciones.db` (verificable reabriendo la app o leyendo el archivo).
- [ ] `npm run dist` genera el instalador/portable que al abrirse inicializa todo.
- [ ] `npm test` pasa con cobertura de la capa `api/`.
- [ ] `npm run build` sin errores.
- [ ] Interfaz en español y responsiva.

## Open Questions

1. ~~¿Auth?~~ → Sin auth en MVP (modo test). `registradoPor` y `creadoPor` son campos texto.
2. ~~¿Estados de pedido?~~ → `estado` con default "pendiente".
3. ~~¿Stock?~~ → Solo flag `disponible`, sin stock numérico.
4. ¿Se necesita historial de versiones de colaciones (auditoría)? *(Asumo no en MVP.)*
5. ¿La precarga de colación al crear pedido copia los items o los referencia? *(Asumo copia con snapshot — el pedido queda independiente de la colación origen.)*

## Menú de referencia (ejemplo real)

Datos de ejemplo para seed inicial del catálogo (colección `productos`):

| nombre | descripcion | precio | categoria |
|---|---|---|---|
| Bebida en lata 350 ml | Fanta | 1200 | bebida |
| Bebida 250 ml | Coca-Cola | 800 | bebida |
| Jugo del valle 400 ml | piña | 1400 | bebida |
| Crema de verduras | | 1200 | crema |
| Cazuela de osobuco | + ensalada surtida | 6800 | fondo |
| Cazuela de asado de tira | + ensalada surtida | 6800 | fondo |
| Tallarines al pesto | + pescado/chuleta/bistec + ensalada | 6800 | fondo |
| Chuleta | + arroz + huevo + guiso/papas + ensalada | 6800 | fondo |
| Pescado frito o apanado | + arroz + guiso/papas + ensalada | 6500 | fondo |
| Carne a la olla con champiñones | + arroz + guiso/papas + ensalada | 6500 | fondo |
| Bistec de pollo | + arroz + papas/guiso + ensalada | 6500 | fondo |
| Carne Mongoliana | + arroz + papas/guiso + ensalada | 6500 | fondo |
| Salmón a la mantequilla | + arroz + guiso/papas + ensalada | 7500 | fondo |
| Reineta a la mantequilla | + arroz + guiso/papas + ensalada | 7000 | fondo |
| Arroz | agregado | 0 | agregado |
| Puré | agregado | 0 | agregado |
| Papas fritas | agregado | 0 | agregado |
| Guiso de zapallo italiano | agregado | 0 | agregado |
| Ensalada surtida | | 0 | ensalada |
