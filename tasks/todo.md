# TODO: app_Colaciones — Requisitos Anto (21/8/2026)

## Resumen

6 requisitos solicitados, agrupados en 3 bloques coordinados tras revisión adversarial (`tasks/revision-planes.md`):
- **Bloque A**: Clientes + Delivery (Req 1 + 2 fusionados)
- **Bloque B**: Estados + Permisos + Bloqueo (Req 3 + 4 + 5 fusionados)
- **Bloque C**: Métodos de Pago (Req 6)

Planes detallados: `tasks/plan-req-*.md`. Plan consolidado: `tasks/plan.md`.

## Fase 1: Bloque A — Clientes + Delivery

- [ ] **A1** Colección `clientes` + tipos + schemas + API CRUD + `findOrCreateCliente`
- [ ] **A2** Hook `useClientes` + UI Clientes (form + list + page + ruta /clientes)
- [ ] **A3** Integrar `clienteId` en `Pedido` + migración (elimina `cliente: string`)
- [ ] **A4** Delivery Padre Hurtado $1.300 por pedido + aviso informativo si hay otro pedido con misma dirección

### Checkpoint A
- [ ] `npm test` + `npm run build` OK
- [ ] Flujo: crear cliente → pedido delivery $1.300 → 2do pedido misma dirección → aviso informativo

## Fase 2: Bloque B — Estados + Permisos + Bloqueo

- [ ] **B1** Expandir `EstadoPedido` (creado|pagado|programado|entregando|entregado|cancelado) + transiciones + helpers + migración pendiente→creado
- [ ] **B2** UI estados en PedidoList (select + labels + colores data-estado)
- [ ] **B3** Guard de rutas + ProtectedRoute + ruta /login
- [ ] **B4** Auditoría cambios de estado (cambiarEstadoPedido + updateDoc + arrayUnion + historialEstados)
- [ ] **B5** Firestore Rules (isAuthedAdmin verifica usuariosPermitidos + bloqueo entregado) — auditar doc IDs antes
- [ ] **B6** Bloqueo edición UI + API + hook (esEditable/esEliminable/esTerminal)
- [ ] **B7** UI auditoría en PedidoList (quién/cuándo cambió estado)

### Checkpoint B
- [ ] `npm test` + `npm run build` OK
- [ ] Firestore Rules desplegadas y verificadas
- [ ] Flujo: creado → pagado → programado → entregando → entregado (no editable)

## Fase 3: Bloque C — Métodos de Pago

- [ ] **C1** `metodoPago` + `estadoPago` en modelo + API + `confirmarPago` (sincroniza estado='pagado')
- [ ] **C2** UI método de pago en PedidoForm + PedidoList + botón confirmar pago

### Checkpoint C
- [ ] `npm test` + `npm run build` OK
- [ ] Flujo: efectivo (pagado al crear) → tarjeta (pendiente) → confirmar pago

## Fase 4: Verificación final

- [ ] **V1** Migración de datos unificada (pendiente→creado, cliente→clienteId, defaults pago)
- [ ] **V2** Tests integración + build + lint final

### Checkpoint Complete
- [ ] `npm test`, `npm run build`, `npm run lint` pasan
- [ ] Firestore Rules en producción
- [ ] Migración ejecutada y verificada

## Decisiones clave (resueltas tras revisión)

- `Pedido.cliente: string` → `clienteId` + snapshots (Req 1 gana sobre Req 2)
- `EstadoPedido` = 6 valores (Req 3); Req 4 alineado al nuevo enum
- `estadoPago` es fuente de verdad; `estado='pagado'` es derivado (sincronización atómica)
- `entregado` y `cancelado` son terminales (no reversibles)
- `cancelado` no editable pero sí eliminable
- Helpers de dominio centralizados en `src/utils/pedidoEstado.ts`
- `src/api/pedidos.ts` se reescribe coordinadamente (no merges independientes)
- Firestore Rules combinan auth (Req 4) + bloqueo entregado (Req 5)

## Open questions pendientes (confirmar con Anto)

- ¿Lista final de métodos de pago? (asumido: efectivo | tarjeta | transferencia)
- ¿Delivery único por día? → **Resuelto: delivery por pedido, cada uno $1.300. Aviso si hay otro con misma dirección.**
- ¿Costo delivery fijo $1.300 o configurable? (asumido: fijo MVP)
- ¿Roles diferenciados o todos los autorizados cambian estado? (asumido: todos)
