# Plan: Colaciones → Platos (con subtipos Menú / Colación)

## Decisión de dominio (confirmada con el usuario)

- **Plato** = entidad general (antes `Colacion`).
- `tipo: 'menu' | 'colacion'`:
  - **menú** = ítems libres/variables; lleva `fecha` (menú del día).
  - **colación** = set predefinido: ítems fijos **y** `valor` (precio fijo) obligatorio; `fecha` opcional.
- `activa` = "disponible hoy": **varios platos activos a la vez** (se elimina la regla de exclusividad y `opsDesactivar`).
- `Pedido.colacionId` → `platoId`.
- La sección del nav y la página se llaman **Platos** (ruta `/platos`).
- El nombre de producto/app "Colaciones" (Layout, login, `window.colaciones` bridge, appId) **no** cambia — es la marca, no la entidad.

## Migración de datos (electron/db.mjs)

- `COLLECTIONS`: `colaciones` → `platos`.
- `createDb` migra DBs viejas en una transacción:
  - `colaciones` (tabla) → `platos`, backfill `tipo='menu'` a docs sin tipo.
  - `pedidos.data.colacionId` → `platoId` (json_set + json_remove).
  - `DROP TABLE colaciones`.

## Slices

1. **Dominio + persistencia**: types, schemas (PlatoSchema + refine tipo→valor/fecha), db.mjs (colección + migración), api/platos.ts (sin exclusividad; `setPlatoActiva(id, activa)` toggle; `getPlatosActivos()` plural), usePlatos.
2. **UI**: renombres (PlatoList/PlatoForm/PlatosPage), badge "Disponible hoy" toggle, chip de tipo + valor, layout sin fecha (nombre como titular), **filtros** en la página: texto por nombre + chips Todos/Menús/Colaciones (`filtrarPlatos` en utils), rutas/nav, PedidoForm (`platos`, `platoId`), PedidoTablero, PedidosPage, preview.
3. **Demo seed** → `seed-demo-platos.mjs`: ~6 menús + ~4 colaciones con `valor`, 3–4 activos, idempotente (`demo:true`).
4. **Tests**: renombrar/actualizar + nuevos (filtro por tipo y nombre, múltiples activos, valor obligatorio en colación, persistencia de tipo/valor/platoId).
5. **Verificación**: suite completa + lint + build + re-seed DB real + smoke Electron.

## Criterios de éxito

- Varios platos con `activa=true` simultáneos, el botón es toggle.
- Crear una colación sin `valor` falla validación; menú sin `fecha` falla.
- La página filtra por tipo y por nombre (texto libre, case-insensitive).
- DB vieja migra sin perder datos (productos, pedidos, usuarios intactos).
- 173+ tests verdes; lint sin errores; la app muestra los demos nuevos.

## Estado final (2026-09-29) — COMPLETADO

- Slice 1–4 implementados; ver `docs/decisions/ADR-002-dominio-platos.md`.
- **183/183 tests** verdes; lint 0 errores; `tsc -b && vite build` OK.
- Migración verificada en DB real: 10 docs viejos de `colaciones` → `platos`
  (`tipo='menu'`), `pedidos.colacionId` → `platoId`, tabla vieja eliminada.
- `npm run seed:demo` sembró 6 menús + 4 colaciones (3 marcados `[HOY]`);
  el "menu de hoy" manual del usuario se preservó como `menu`.
- Bug real corregido durante el trabajo: `min=1 step=100` en el input de
  valor bloqueaba el submit nativo (6800 no es `1+n·100`) sin mensaje.
  Validación ahora vive en `handleSubmit` + Zod.
- App relanzada en dev (Electron) mostrando la grilla Platos con fotos.
