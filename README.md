# app_Colaciones

Aplicación web para la gestión de colaciones alimentarias (refrigerios / snacks). Permite administrar un **catálogo de productos** (CRUD), armar **colaciones** (menú del día con roles: fondo, agregado, ensalada, extra) y registrar/listar **pedidos**. Los datos persisten en **Firebase Firestore**.

## Stack

- React 18 + Vite 5 + TypeScript
- React Router para navegación
- CSS Modules (sin framework de UI)
- Firebase Firestore (persistencia)
- Vitest + React Testing Library para tests

## Estructura

```
src/
├── api/          → Funciones Firestore por entidad (productos, colaciones, pedidos)
├── components/   → Componentes de UI (listas, formularios, layout)
├── firebase/     → Inicialización de Firebase
├── hooks/        → Hooks useProductos, useColaciones, usePedidos
├── pages/        → Páginas (ProductosPage, ColacionesPage, PedidosPage)
├── types/        → Tipos compartidos (Producto, Colacion, Pedido, roles)
└── styles/       → CSS global
apps-script/      → [legacy] Web App de Apps Script (migrado a Firestore)
scripts/          → Seed de productos
tests/            → Tests unitarios (api, hooks, componentes)
firestore.rules   → Reglas de seguridad Firestore
docs/spec.md      → Especificación del proyecto
tasks/            → Plan y lista de tareas
```

## Modelo de datos

### Colecciones Firestore

- **`productos`**: catálogo de productos con categoría (`fondo`, `agregado`, `ensalada`, `bebida`, `crema`, o custom) y `disponible`.
- **`colaciones`**: menú del día con items que referencian productos y tienen un `rol` (`fondo`, `agregado`, `ensalada`, `extra`). Solo una colación puede estar `activa` a la vez.
- **`pedidos`**: pedidos con `fecha`, `cliente`, `registradoPor`, `items` (con rol, agregado, ensalada, notas, cantidad), `total`, `estado`.

### Roles de item

Cada item de colación o pedido tiene un `rol`:

- `fondo` — plato principal
- `agregado` — acompañamiento (arroz, puré, papas fritas, etc.)
- `ensalada` — ensalada
- `extra` — cualquier otro item (bebida, postre, etc.)

## Setup

### 1. Frontend

```bash
npm install
cp .env.example .env
# Edita .env y pon tu VITE_FIREBASE_CONFIG
npm run dev
```

### 2. Firebase Firestore

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Habilita **Firestore Database** (región recomendada: `southamerica-east1`).
3. Registra una **Web App** y copia el config (Project Settings → Your apps → SDK setup).
4. Pega el config en `.env` como `VITE_FIREBASE_CONFIG` (JSON string, una línea).
5. Deploy de reglas: `firebase deploy --only firestore:rules --project <tu-project-id>`.
6. (Opcional) Seed inicial: `npx tsx scripts/seed-productos.ts`.

### 3. Comandos

```bash
npm run dev          # desarrollo
npm run build        # build producción
npm run preview      # previsualizar build
npm test             # tests
npm run test:coverage
```

## Skills de agente

Este repo incluye un catálogo de skills de ingeniería (de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)) en `skills/`. Estos workflows (spec-driven-development, planning-and-task-breakdown, incremental-implementation, test-driven-development, etc.) gobiernan cómo los agentes de IA trabajan en el proyecto. Ver `AGENTS.md` y `CLAUDE.md`.

## Notas

- MVP sin autenticación. Las reglas de Firestore permiten lectura/escritura pública en modo test (ver `firestore.rules`).
- `apps-script/Codigo.gs` es legacy (Google Sheets backend). La app usa Firestore.
- Los pedidos se crean con `estado = "pendiente"` por defecto.
- `registradoPor` es texto libre (sin auth).
