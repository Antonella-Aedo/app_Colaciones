# Implementation Plan: Menú del día + Pedidos estructurados

## Overview

Extender app_Colaciones para soportar (1) catálogo de productos con categorías fijas+extensibles, (2) menú del día editable como entidad independiente que referencia productos del catálogo, y (3) pedidos estructurados con personalizaciones (1 agregado opcional, ensalada opcional, notas) y atribución al usuario registrante. Backend Apps Script + Google Sheets se extiende con una hoja `Menus`.

## Architecture Decisions

- **Menú del día = entidad independiente** con su propia hoja `Menus` (items como JSON string, igual que pedidos). Referencia `productoId` del catálogo; permite `precioOverride` y `nota` por item. Solo referencias al catálogo (no items sueltos).
- **Agregados configurables vía catálogo**: los agregados son productos con `categoria = 'agregado'`. El `PedidoForm` los obtiene filtrando el catálogo por esa categoría. No hay lista hardcodeada.
- **Item de pedido extendido**: snapshot de `nombre`/`precio` + `cantidad` + `agregado?` + `ensalada?` + `notas?`. El agregado/ensalada no cambian el precio (incluidos en el fondo). El `total` sigue siendo Σ precio×cantidad.
- **Pedido con `registradoPor`**: campo texto añadido a la hoja `Pedidos` (nueva columna). Sin login.
- **Categorías fijas + extensibles**: el `ProductoForm` usa un `<select>` con las 5 fijas (`fondo`, `ensalada`, `agregado`, `bebida`, `crema`) más un option "Otra…" que habilita input libre. Las categorías custom se persisten como string.
- **Backend primero**: se extiende `Codigo.gs` y la plantilla Excel antes del frontend, para que el contrato API quede definido.

## Task List

### Phase 1: Backend (Apps Script + Sheets)

- [ ] Task 1: Extender `Codigo.gs` con entidad Menú del día + `registradoPor` en Pedidos
- [ ] Task 2: Actualizar plantilla Excel (catálogo seed con categorías + agregados + ensaladas)

### Checkpoint: Backend
- [ ] `Codigo.gs` compila (sintaxis válida)
- [ ] Plantilla Excel tiene hojas: Productos, Pedidos, Menus con encabezados correctos

### Phase 2: Tipos y API frontend

- [ ] Task 3: Extender `types/index.ts` (ItemPedido + agregado/ensalada/notas, Pedido + registradoPor, MenuDia, ItemMenu)
- [ ] Task 4: Crear `api/menus.ts` + tests de api menus y pedidos

### Checkpoint: Tipos/API
- [ ] `npm test` pasa (api tests)
- [ ] `npm run build` sin errores de tipos

### Phase 3: UI Menú del día

- [ ] Task 5: Hook `useMenus` + `MenuDiaEditor` + `MenuPage` + ruta + nav

### Checkpoint: Menú del día
- [ ] Flujo armar/editar menú del día funciona end-to-end (con Web App desplegado)

### Phase 4: UI Pedidos estructurados

- [ ] Task 6: Extender `PedidoForm` (agregado opcional desde catálogo, ensalada opcional, notas, registradoPor, validación 1 agregado)
- [ ] Task 7: Extender `PedidoList` (mostrar registradoPor + detalle items con agregado/ensalada/notas)

### Checkpoint: Pedidos
- [ ] Crear pedido con personalizaciones funciona end-to-end
- [ ] Validación: solo 1 agregado por item fondo

### Phase 5: UI Productos (categorías)

- [ ] Task 8: Extender `ProductoForm` (select categoría fijas + "Otra…" libre)

### Phase 6: Polish y verificación

- [ ] Task 9: Tests de componentes (PedidoForm validación agregado, MenuDiaEditor render)
- [ ] Task 10: Build + lint + verificación final de success criteria

### Checkpoint: Complete
- [ ] Todos los success criteria de `docs/spec.md` cumplidos
- [ ] `npm test`, `npm run build`, `npm run lint` pasan

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Apps Script no permite multi-hoja con JSON string fácilmente | Med | Usar mismo patrón que Pedidos (items como JSON string en una columna) |
| Cambiar columnas de Pedidos rompe datos existentes | Bajo | MVP sin datos en producción; plantilla nueva |
| Categorías custom colisionan con nombres fijos | Bajo | Normalizar a minúsculas al guardar |
| Agregados con precio 0 confunden el total | Bajo | Agregado/ensalada no se suman (incluidos en fondo); solo items con precio>0 suman |

## Open Questions

- Ninguna (todas resueltas en spec).

## Parallelization Opportunities

- Tasks 6 y 7 (PedidoForm y PedidoList) son independientes y pueden paralelizarse.
- Task 8 (ProductoForm) es independiente de 5-7 y puede paralelizarse.
- Tasks 1-2 (backend) deben ir antes que 3-4 (frontend API) — secuencial.
