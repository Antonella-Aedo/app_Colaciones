# TODO: app_Colaciones — Estado final

## Resumen

Migración completa de Google Apps Script → Firebase Firestore. Build OK, 20/20 tests pasan, BD Firestore creada y con seed de 19 productos.

## Tareas completadas

- [x] **Migración a Firestore** — `src/firebase/config.ts`, API modules (`productos.ts`, `colaciones.ts`, `pedidos.ts`), hooks (`useProductos`, `useColaciones`, `usePedidos`).
- [x] **Modelo normalizado** — `ColacionItem` con `rol` (fondo, agregado, ensalada, extra), `PedidoItem` con rol + agregado + ensalada + notas + cantidad.
- [x] **UI Colaciones** — `ColacionForm` + `ColacionesPage` con activar/desactivar menú del día (batch write, solo uno activo).
- [x] **UI Pedidos** — `PedidoForm` con precarga desde colación, personalización por item. `PedidoList` con detalle de roles y items.
- [x] **UI Productos** — `ProductoForm` con categorías fijas + custom.
- [x] **Tests** — 20/20 pasan (api productos/colaciones/pedidos, componentes PedidoForm/ColacionForm, hook useProductos, smoke).
- [x] **Firebase setup** — Proyecto `app-colaciones-506203`, BD en `southamerica-east1`, reglas deployadas, Web App registrada, config en `.env`.
- [x] **Seed inicial** — 19 productos insertados (fondos, agregados, ensaladas, bebidas, crema).
- [x] **Build** — `npm run build` sin errores.
- [x] **README** — Actualizado con stack Firestore.

## Tareas pendientes (no bloqueantes)

- [ ] **Lint** — ESLint no instalado en el proyecto. Opcional: `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`.
- [ ] **Reglas de producción** — `firestore.rules` está en modo test (público). Para producción, restringir con auth.
- [ ] **Probar app end-to-end** — Verificar flujo completo en navegador (crear colación → crear pedido desde colación).
- [ ] **Limpiar archivos legacy** — `Colaciones.xlsx`, `Colaciones_nuevo.xlsx`, `scripts/generar_plantillas.py` son del backend anterior (Apps Script). `apps-script/Codigo.gs` se conserva como referencia.

## Tareas descartadas (Apps Script legacy)

Las tasks originales (1–10) del plan Apps Script quedan obsoletas tras la migración a Firestore. Ver `tasks/plan.md` para el historial.
