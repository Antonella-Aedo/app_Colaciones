# app_Colaciones

Aplicación de **escritorio** para la gestión de colaciones alimentarias (refrigerios / snacks). Permite administrar un **catálogo de productos** (CRUD), armar **colaciones** (menú del día con roles: fondo, agregado, ensalada, extra) y registrar/listar **pedidos**. Los datos persisten en una **base de datos local SQLite** — sin servicios externos, sin nube, sin config.

## Stack

- **App de escritorio:** Electron 44 (proceso principal = Node + DB)
- **Persistencia:** SQLite vía `better-sqlite3` (document store: colecciones `productos`, `colaciones`, `pedidos`, `clientes`, `usuariosPermitidos`)
- **Frontend:** React 18 + Vite 5 + TypeScript, CSS Modules, HashRouter
- **Tests:** Vitest + React Testing Library (los tests corren contra la DB real en `:memory:`)

## Cómo correr

```bash
npm install
npm run dev        # vite + electron: ventana de escritorio con hot-reload
npm run app        # build + abrir la app como en producción
npm start          # igual que app (sin rebuild)
```

Al abrir la app la base de datos se inicializa sola:

- **Archivo:** `%APPDATA%\app-colaciones\colaciones.db` (Windows)
- **Primer arranque:** siembra automáticamente el catálogo de 19 productos
- **Login:** el primer correo que ingresa queda registrado en `usuariosPermitidos`; los siguientes deben estar en esa lista

## Generar el instalador / portable

```bash
npm run dist       # genera release/Colaciones-Setup-<version>.exe (instalador NSIS)
                   # y release/Colaciones-portable.exe (doble clic, sin instalar)
npm run pack       # empaqueta sin comprimir en release/ (para probar rápido)
```

El `.exe` portable es el "archivo único": doble clic → se inicializa la DB y abre la aplicación.

## Estructura

```
electron/
├── main.cjs        → Proceso principal: DB, IPC, ventana
├── preload.cjs     → Expone window.colaciones.invoke() al renderer
├── db.mjs          → Capa de persistencia (document store sobre SQLite)
├── db.d.mts        → Tipos de db.mjs
└── seed-data.mjs   → Catálogo inicial (19 productos)
src/
├── api/            → Capa de acceso a datos (usa window.colaciones vía IPC)
│   └── clientDb.ts → Puente renderer ↔ DB local
├── auth/           → AuthProvider local (sesión + usuariosPermitidos)
├── components/     → Componentes de UI (listas, formularios, layout)
├── hooks/          → Hooks useProductos, useColaciones, usePedidos, useClientes
├── pages/          → Páginas (Productos, Colaciones, Pedidos, Clientes, Login)
├── types/          → Tipos compartidos
└── styles/         → CSS global
apps-script/        → [legacy] Web App de Apps Script (no activo)
tests/              → Tests (api, hooks, componentes, utils)
docs/spec.md        → Especificación del proyecto
```

## Modelo de datos

### Colecciones

- **`productos`**: catálogo con categoría (`fondo`, `agregado`, `ensalada`, `bebida`, `crema`, o custom) y `disponible`.
- **`colaciones`**: menú del día; items con `rol` (`fondo`, `agregado`, `ensalada`, `extra`). Solo una puede estar `activa` a la vez (transacción exclusiva).
- **`pedidos`**: `fecha`, snapshots de cliente, `registradoPor`, `items`, `total`, `estado` (`creado|pagado|finalizado|cancelado`), `tipoEntrega`/`deliveryCost`, `metodoPago`/`estadoPago`, auditoría de estados.
- **`clientes`**: dirección + contacto (normalizados) + nombre opcional.
- **`usuariosPermitidos`**: correos autorizados (id = email lowercase).

## Tests y calidad

```bash
npm test           # suite completa (db :memory: real)
npm run lint       # ESLint
npm run build      # typecheck + bundle
```

## Notas

- `apps-script/` es legacy (backend Google Sheets) y se conserva sin uso.
- Los tests ya no mockean un backend: usan `electron/db.mjs` con SQLite `:memory:` (ver `tests/helpers/testDb.ts`).
- Si la DB fuera a correr en modo navegador (sin Electron), `src/api/clientDb.ts` es el único punto a extender (p. ej. fallback HTTP).
