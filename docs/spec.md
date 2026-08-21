# Spec: app_Colaciones

## Objective

Aplicación web frontend para la gestión de colaciones alimentarias (menú del día + pedidos). Permite:

- Administrar un **catálogo de productos** (CRUD) organizados por categoría.
- Armar/editar **colaciones** (platos compuestos: fondo + agregado + ensalada + N extras) y marcar una como **menú del día activo** (favorito).
- **Registrar pedidos** precargando una colación existente (editable) o creando desde cero, con personalizaciones y atribución al usuario que registra.
- Listar pedidos y ver detalle.

Los datos persisten en **Firestore** (Firebase). Se conserva el backend legacy de Apps Script + Google Sheets como fallback no activo.

**Usuario objetivo:** administrador de un servicio de colaciones que necesita publicar el menú del día y registrar pedidos.

**Criterios de éxito:**
- El administrador puede crear, listar, editar y eliminar productos del catálogo.
- El administrador puede armar colaciones (platos compuestos) seleccionando productos del catálogo con roles (fondo, agregado, ensalada, extra), con N extras sin límite.
- El administrador puede marcar una colación como "menú del día activo" (solo una activa a la vez).
- El administrador puede registrar pedidos **precargando una colación** (y editando los items) o **desde cero**, con cantidad, agregado, ensalada, notas, atribuyendo a un usuario (campo texto).
- El administrador puede listar pedidos y ver detalle.
- Los cambios se reflejan en Firestore.
- La interfaz es responsiva y está en español.

## Modelo de dominio (normalizado — 1FN/2FN/3FN)

### Productos (catálogo)

Catálogo de items atómicos. Cada producto tiene una categoría.

```
id: string (Firestore doc ID)
nombre: string
descripcion: string
precio: number
categoria: string       // 'fondo' | 'ensalada' | 'agregado' | 'bebida' | 'crema' | custom
disponible: boolean
```

Colección Firestore: `productos`

### Colaciones (plato compuesto / menú)

Cabecera de un plato compuesto. Una colación referencia N productos del catálogo con un rol. Solo una colación puede estar `activa` (menú del día) a la vez.

```
id: string (Firestore doc ID)
nombre: string
fecha: string           // ISO yyyy-MM-dd
activa: boolean         // menú del día activo (favorito). Solo una true a la vez.
creadoPor: string       // usuario que armó la colación (campo texto)
items: ColacionItem[]   // subcolección embebida (array de objetos en Firestore)
```

**ColacionItem** (detalle N:M, embebido como array en Firestore):

```
productoId: string      // referencia a producto del catálogo
rol: string             // 'fondo' | 'agregado' | 'ensalada' | 'extra'
orden: number           // posición dentro de la colación
nota?: string           // nota opcional
```

Colección Firestore: `colaciones`

**Regla de negocio:** al marcar una colación como `activa`, se desactivan las demás (transacción o batch write en Firestore).

### Pedidos

Pedido registrado. Puede precargar una colación o crearse desde cero.

```
id: string (Firestore doc ID)
fecha: string           // ISO yyyy-MM-dd
cliente: string
registradoPor: string   // usuario que registra (campo texto, sin login)
colacionId?: string     // referencia opcional a la colación precargada (null si desde cero)
items: PedidoItem[]     // subcolección embebida
total: number           // Σ precio × cantidad
estado: string          // 'pendiente' | 'entregado' | 'cancelado'
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

Colección Firestore: `pedidos`

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

- **Frontend:** React 18 + Vite 5 (TypeScript)
- **Estilos:** CSS Modules (sin framework de UI en el MVP)
- **Backend:** Firebase Firestore (colecciones `productos`, `colaciones`, `pedidos`)
- **Firebase SDK:** `firebase` v10+ (modular)
- **Reglas Firestore:** modo test (abierto) para desarrollo; cambiar a reglas reales post-MVP
- **Región Firestore:** southamerica-east1
- **Tests:** Vitest + React Testing Library (Firestore mockeado)
- **Lint:** ESLint + Prettier (config base de Vite)
- **Legacy (no activo):** Apps Script + Google Sheets (código conservado en `apps-script/`)

## Commands

```bash
npm install
npm run dev              # desarrollo
npm run build            # build producción (tsc -b && vite build)
npm run preview          # previsualizar build
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
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── firebase/
│   │   └── config.ts        → Inicialización de Firebase + Firestore
│   ├── api/
│   │   ├── productos.ts     → CRUD productos (Firestore)
│   │   ├── colaciones.ts    → CRUD colaciones + activar menú del día
│   │   └── pedidos.ts       → CRUD pedidos
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── ProductoForm.tsx
│   │   ├── ProductoList.tsx
│   │   ├── ColacionForm.tsx → Editor de colación (plato compuesto)
│   │   ├── ColacionList.tsx
│   │   ├── PedidoForm.tsx   → Pedido con precarga de colación
│   │   └── PedidoList.tsx
│   ├── hooks/
│   │   ├── useProductos.ts
│   │   ├── useColaciones.ts
│   │   └── usePedidos.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
├── tests/
├── firebase.json            → Config de Firebase CLI
├── firestore.rules          → Reglas de Firestore (test mode)
├── .env                     → VITE_FIREBASE_CONFIG
└── .env.example
```

## Code Style

- TypeScript estricto, sin `any`.
- Componentes funcionales con hooks; sin class components.
- Nombres de componentes en PascalCase; hooks prefijados con `use`.
- Funciones API en minúsculas y verbos (`getProductos`, `createColacion`).
- Un archivo por componente; CSS Modules junto al componente.
- Firebase SDK modular (v9+ imports: `import { getFirestore, collection, ... }`).

```tsx
// Ejemplo: inicialización de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

## Testing Strategy

- **Framework:** Vitest + React Testing Library.
- **Ubicación:** `tests/` para tests de API/lógica; `tests/components/` para UI.
- **Firestore mockeado:** los tests de API mockean el módulo `firebase/firestore` con vi.mock.
- **Cobertura:** capa `api/` (CRUD de productos, colaciones, pedidos) con tests unitarios.
- **Niveles:**
  - Unitarios: `api/*`, hooks.
  - Componentes: render y eventos de formularios (incluye validación de reglas de agregados, precarga de colación).
  - E2E: fuera del alcance del MVP.

## Boundaries

- **Always:** Ejecutar `npm test` antes de commits. Validar inputs. Tipar todo con TS estricto. Snapshot de nombre/precio en items de pedido. Usar batch writes para activar/desactivar colaciones.
- **Ask first:** Cambiar reglas de Firestore. Añadir nuevas dependencias. Cambiar la región de Firestore.
- **Never:** Commitear el config de Firebase con credenciales en texto plano (usar `.env`). Eliminar tests sin aprobación. Usar `any`. Eliminar el código legacy de Apps Script (se conserva).

## Success Criteria

- [ ] `npm run dev` levanta la app sin errores.
- [ ] Pantalla de Productos: CRUD funciona contra Firestore.
- [ ] Pantalla de Colaciones: armar colación con productos del catálogo (roles fondo/agregado/ensalada/extra), N extras, marcar como activa (menú del día).
- [ ] Solo una colación activa a la vez (batch write).
- [ ] Pantalla de Pedidos: crear **precargando una colación** (editable) o **desde cero**, con personalizaciones y registradoPor.
- [ ] Total del pedido calculado correctamente.
- [ ] Los datos persisten en Firestore (verificable en Firebase Console).
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
