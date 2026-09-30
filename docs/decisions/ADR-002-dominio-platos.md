# ADR-002: Dominio Plato con subtipos Menú y Colación

## Status
Accepted

## Date
2026-09-29

## Context

La entidad central se llamaba `Colacion` y representaba el "menú del día":
exactamente **una** activa a la vez (activar una desactivaba las demás en
transacción). El usuario redefinió el dominio:

- El término general pasa a ser **plato**.
- Existen dos tipos: **menú** (ítems libres/variables, oferta del día con
  `fecha`) y **colación** (set predefinido: ítems fijos **y** `valor` — precio
  fijo — obligatorio).
- Pueden existir **varios platos activos simultáneos**; `activa` significa
  "disponible hoy".
- La sección/página/nav se llama **Platos** (`/platos`); la marca de la app
  "Colaciones" no cambia.

## Decision

- `Plato { tipo: 'menu' | 'colacion', fecha?, valor?, activa, items, foto? }`.
- Reglas cruzadas en Zod (`superRefine` compartido por `PlatoSchema` y
  `PlatoInputSchema`): `colacion` exige `valor > 0`; `menu` exige `fecha`.
- Se elimina la exclusividad de activo: `setPlatoActiva(id, activa)` es un
  toggle por documento; `getPlatosActivos()` devuelve todos los activos.
- `Pedido.colacionId` → `Pedido.platoId`.
- `foto` guarda una **clave** (`'cazuela'`, `'salmon'`…) resuelta por
  `src/assets/menuFotos.ts` a assets empaquetados — el dato no depende de
  cómo Vite hashea los archivos y funciona offline.
- Migración automática en `createDb` (transacción al abrir DBs viejas):
  tabla `colaciones` → `platos` con backfill `tipo='menu'`;
  `pedidos.data.colacionId` → `platoId` vía `json_set`/`json_remove`;
  `DROP TABLE colaciones`.
- Compatibilidad de ruta: `/colaciones` redirige a `/platos`.

## Alternatives Considered

### Dos entidades separadas (`Menu` y `Colacion`)
- Pros: modela la diferencia sin campos opcionales.
- Contras: duplica UI/hooks/API para dos listas casi idénticas; el usuario
  quiere verlas juntas y filtrarlas por tipo en una sola grilla.
- Rechazado: un solo documento con `tipo` + refinamiento cubre el dominio
  con menos superficie.

### Mantener exclusividad solo dentro del tipo `menu`
- Pros: preserva "un menú del día".
- Contras: el usuario definió activo = disponible hoy sin límite; inventar
  reglas extra contradice el pedido.
- Rechazado.

## Consequences

- `PlatoForm` muestra `fecha` solo en menús y `valor` solo en colaciones;
  la validación nativa `min/step` del input numérico se eliminó porque
  bloqueaba el submit silenciosamente (la regla vive en `handleSubmit` + Zod).
- `PlatosPage` filtra por nombre (substring case-insensitive) y por tipo
  (chips Todos/Menús/Colaciones) vía `filtrarPlatos` (función pura testeada).
- Seed demo: `electron/seed-demo-platos.mjs` (`npm run seed:demo`) siembra
  6 menús + 4 colaciones, varios activos, idempotente (`demo: true`) — no
  toca documentos creados a mano.
- Datos viejos sobreviven: al abrir una DB anterior las `colaciones` se
  migran a `platos` como `tipo='menu'` y los pedidos actualizan su
  `colacionId` → `platoId`.
