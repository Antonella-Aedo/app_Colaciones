# Implementation Plan: Clientes, Delivery, Estados, Permisos, Bloqueo y Pagos

## Overview

Extensión de app_Colaciones con 6 requisitos solicitados por Anto, agrupados en 3 bloques coordinados según la revisión adversarial (`tasks/revision-planes.md`):

- **Bloque A: Clientes + Delivery** (Req 1 + Req 2 fusionados) — nueva colección `clientes` + delivery Padre Hurtado $1.300 con cobro único por cliente.
- **Bloque B: Estados + Permisos + Bloqueo** (Req 3 + Req 4 + Req 5 fusionados) — expansión de `EstadoPedido`, auditoría de cambios, guard de rutas, Firestore Rules, bloqueo de edición si entregado.
- **Bloque C: Métodos de Pago** (Req 6) — `metodoPago` + `estadoPago` con sincronización al estado `pagado`.

Los 6 planes individuales detallados están en `tasks/plan-req-*.md`. La revisión de conflictos en `tasks/revision-planes.md`.

## Architecture Decisions

### Modelo de datos final de `Pedido` (consolidado)
```
id: string
fecha: string                       // ISO yyyy-MM-dd
clienteId: string                   // ref a colección clientes (Req 1)
clienteNombre: string | null        // snapshot opcional (Req 1)
clienteDireccion: string            // snapshot (Req 1)
clienteContacto: string             // snapshot (Req 1)
registradoPor: string
colacionId?: string | null
items: PedidoItem[]
total: number                       // Σ precio×cantidad + deliveryCost
estado: EstadoPedido                // creado | pagado | programado | entregando | entregado | cancelado
// Entrega (Req 2)
tipoEntrega: 'delivery' | 'retiro'
deliveryCost: number                // 0 | 1300
// Pago (Req 6)
metodoPago: 'efectivo' | 'tarjeta' | 'transferencia'
estadoPago: 'pendiente' | 'pagado'  // fuente de verdad del pago
// Auditoría (Req 4)
estadoActualizadoPor: string        // email del último cambio
estadoActualizadoEn: string         // ISO timestamp
historialEstados: CambioEstado[]    // array de {estado, cambiadoPor, cambiadoEn}
```

### EstadoPedido final (Req 3)
`'creado' | 'pagado' | 'programado' | 'entregando' | 'entregado' | 'cancelado'`

Transiciones válidas (restringidas, validadas en API):
```
creado → pagado | cancelado
pagado → programado | cancelado
programado → entregando | cancelado
entregando → entregado | programado (rebote)
entregado → (terminal)
cancelado → (terminal)
```

Migración: `pendiente → creado`. Default de `createPedido`: `'creado'`.

### Fuente de verdad del pago (Req 3 + Req 6)
`estadoPago` es la fuente de verdad. `estado === 'pagado'` es su proyección en el flujo.
La acción "marcar como pagado" setea **ambos** atómicamente. `estadoPago` no se elimina al cambiar de estado (es metadata persistente).

### Bloqueo de edición (Req 5)
| Estado | Editar | Eliminar | Cambiar estado |
|--------|:------:|:--------:|:--------------:|
| creado/pagado/programado/entregando | Sí | Sí | Sí |
| entregado | No | No | No (terminal) |
| cancelado | No | Sí | No (terminal) |

Helpers centralizados en `src/utils/pedidoEstado.ts`: `esEditable`, `esEliminable`, `esTerminal`, `puedeTransicionar`.

### Delivery por pedido + aviso de dirección duplicada (Req 2)
El delivery se cobra **por pedido**: cada pedido con `tipoEntrega='delivery'` suma $1.300 a su total. No hay cobro "único por cliente". Cuando se crea/edita un pedido con delivery y ya existe otro pedido con la **misma dirección** esa fecha, el sistema muestra un **aviso informativo** (no bloquea, no cambia el costo). La API setea `deliveryCost` según `tipoEntrega` (source of truth) y recalcula `total = Σ(precio×cantidad) + deliveryCost`.

### Auditoría de cambios de estado (Req 4)
Nueva función `cambiarEstadoPedido(id, estado, usuarioEmail)` que usa `updateDoc` + `arrayUnion` (NO `setDoc`, que borraría el historial). `updatePedido` se reserva para edición de items/cliente.

### Firestore Rules (Req 4 + Req 5 combinadas)
- `isAuthedAdmin()` verifica `request.auth != null` AND existe doc en `usuariosPermitidos` con email lowercase.
- `allow update, delete: if isAuthedAdmin() && !esEntregado(resource.data.estado)`
- `allow update` de estado (cambio de estado) permitido si no es terminal.

### Reescritura coordinada de `src/api/pedidos.ts`
5 planes modifican este archivo. Se reescribe de una vez con funciones especializadas:
- `createPedido` → valida input, calcula deliveryCost (read-before-write), setea estadoPago inicial
- `updatePedido` → valida que estado sea editable, preserva campos de auditoría
- `cambiarEstadoPedido` → auditoría con `updateDoc` + `arrayUnion`
- `confirmarPago` → setea `estadoPago='pagado'` + `estado='pagado'` atómicamente
- `deletePedido` → valida que estado sea eliminable

## Task List

### Fase 1: Fundacional — Bloque A (Clientes + Delivery)

- [ ] **Task A1: Colección `clientes` + tipos + schemas + API CRUD**
  - Nueva colección `clientes` (direccion, contacto, nombre?). CRUD completo + `findOrCreateCliente`.
  - Aceptación: `getClientes`, `createCliente`, `updateCliente`, `deleteCliente`, `findOrCreateCliente` funcionan con Zod.
  - Verificación: `npm test` (tests de api clientes), `npm run build`.
  - Archivos: `src/types/index.ts`, `src/api/schemas.ts`, `src/api/clientes.ts`, `tests/api/clientes.test.ts`.
  - Dependencias: Ninguna.
  - Scope: M (4 archivos).

- [ ] **Task A2: Hook `useClientes` + UI Clientes (form + list + page + ruta)**
  - Aceptación: Pantalla `/clientes` con CRUD funcional.
  - Verificación: `npm run build`, verificación manual en browser.
  - Archivos: `src/hooks/useClientes.ts`, `src/components/ClienteForm.tsx`, `src/components/ClienteList.tsx`, `src/pages/ClientesPage.tsx`, `src/App.tsx`.
  - Dependencias: A1.
  - Scope: M (5 archivos).

- [ ] **Task A3: Integrar `clienteId` en `Pedido` + migración**
  - `Pedido` cambia `cliente: string` → `clienteId` + snapshots. `PedidoForm` usa selector de cliente. Migración de pedidos existentes.
  - Aceptación: `PedidoForm` selecciona cliente desde lista; pedidos persisten con `clienteId`.
  - Verificación: `npm test`, `npm run build`.
  - Archivos: `src/types/index.ts`, `src/api/schemas.ts`, `src/api/pedidos.ts`, `src/components/PedidoForm.tsx`, `tests/api/pedidos.test.ts`.
  - Dependencias: A1.
  - Scope: M (5 archivos).

- [ ] **Task A4: Delivery Padre Hurtado + aviso de dirección duplicada**
  - Campos `tipoEntrega` + `deliveryCost` en `Pedido`. Delivery por pedido ($1.300 c/u). Aviso informativo cuando hay otro pedido con la misma dirección esa fecha. UI toggle + preview total.
  - Aceptación: Pedido delivery cobra $1.300; si hay otro pedido con misma dirección ese día, se muestra aviso (no bloquea). Retiro = $0.
  - Verificación: `npm test` (test delivery + aviso duplicado), `npm run build`.
  - Archivos: `src/types/index.ts`, `src/api/schemas.ts`, `src/api/pedidos.ts`, `src/components/PedidoForm.tsx`, `src/components/PedidoList.tsx`.
  - Dependencias: A3.
  - Scope: M (5 archivos).

### Checkpoint: Bloque A
- [ ] `npm test` pasa (tests clientes + delivery + pedidos migrados)
- [ ] `npm run build` sin errores
- [ ] Flujo: crear cliente → crear pedido delivery ($1.300) → crear 2do pedido misma dirección → aviso informativo aparece

### Fase 2: Coordinados — Bloque B (Estados + Permisos + Bloqueo)

- [ ] **Task B1: Expandir `EstadoPedido` + transiciones + helpers**
  - Enum final, `puedeTransicionar`, helpers en `src/utils/pedidoEstado.ts`. Migración `pendiente→creado`.
  - Aceptación: `EstadoPedido` tiene 6 valores; `puedeTransicionar` valida transiciones; `createPedido` defaultea `'creado'`.
  - Verificación: `npm test`, `npm run build`.
  - Archivos: `src/types/index.ts`, `src/api/schemas.ts`, `src/api/pedidos.ts`, `src/utils/pedidoEstado.ts`, `tests/api/pedidos.test.ts`.
  - Dependencias: A3 (usa clienteId).
  - Scope: M (5 archivos).

- [ ] **Task B2: UI estados en `PedidoList` (select + labels + estilos)**
  - Select con 6 estados, labels legibles, colores `data-estado`.
  - Aceptación: Select muestra nuevos estados; badge coloreado por estado.
  - Verificación: `npm run build`, verificación manual.
  - Archivos: `src/components/PedidoList.tsx`, `src/components/PedidoList.module.css`.
  - Dependencias: B1.
  - Scope: S (2 archivos).

- [ ] **Task B3: Guard de rutas + `ProtectedRoute`**
  - Ruta `/login` explícita, `ProtectedRoute` con `useAuth`.
  - Aceptación: Acceso a cualquier ruta sin auth redirige a `/login`.
  - Verificación: `npm run build`, verificación manual.
  - Archivos: `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`.
  - Dependencias: Ninguna (independiente).
  - Scope: S (3 archivos).

- [ ] **Task B4: Auditoría de cambios de estado**
  - `cambiarEstadoPedido(id, estado, email)` con `updateDoc` + `arrayUnion`. Campos `estadoActualizadoPor/En` + `historialEstados`.
  - Aceptación: Cambio de estado registra quién/cuándo; historial acumula.
  - Verificación: `npm test` (test auditoría), `npm run build`.
  - Archivos: `src/types/index.ts`, `src/api/schemas.ts`, `src/api/pedidos.ts`, `src/hooks/usePedidos.ts`, `tests/api/pedidos.test.ts`.
  - Dependencias: B1.
  - Scope: M (5 archivos).

- [ ] **Task B5: Firestore Rules — auth + bloqueo por estado**
  - `isAuthedAdmin()` verifica `usuariosPermitidos`. `allow update/delete` bloquea si `entregado`. Combinar Req 4 + Req 5.
  - Aceptación: Rules desplegadas; usuario no autorizado no puede escribir; pedido entregado no se edita via SDK.
  - Verificación: `firebase deploy --only firestore:rules`, prueba con SDK directo.
  - Archivos: `firestore.rules`.
  - Dependencias: B1, B4. **Auditar `usuariosPermitidos` (doc IDs lowercase) antes de desplegar.**
  - Scope: S (1 archivo, cambio de seguridad).

- [ ] **Task B6: Bloqueo de edición en UI + API + hook**
  - Helpers `esEditable`/`esEliminable` aplicados en `PedidoList` (botones disabled), `usePedidos` (update/remove validan), `PedidoForm` (defensivo).
  - Aceptación: Pedido entregado no se edita ni elimina; cancelado no se edita pero se elimina.
  - Verificación: `npm test` (tests bloqueo), `npm run build`.
  - Archivos: `src/hooks/usePedidos.ts`, `src/components/PedidoList.tsx`, `src/components/PedidoForm.tsx`, `tests/hooks/usePedidos.test.tsx`.
  - Dependencias: B1, B4.
  - Scope: M (4 archivos).

- [ ] **Task B7: UI auditoría en `PedidoList`**
  - Mostrar quién/cuándo cambió el estado (último cambio o historial expandible).
  - Aceptación: Columna o tooltip muestra `estadoActualizadoPor` + `estadoActualizadoEn`.
  - Verificación: `npm run build`, verificación manual.
  - Archivos: `src/components/PedidoList.tsx`, `src/components/PedidoList.module.css`.
  - Dependencias: B4.
  - Scope: S (2 archivos).

### Checkpoint: Bloque B
- [ ] `npm test` pasa (tests estados + transiciones + bloqueo + auditoría)
- [ ] `npm run build` sin errores
- [ ] Firestore Rules desplegadas y verificadas
- [ ] Flujo: crear pedido → cambiar estados → entregado (no editable) → cancelado (eliminable)

### Fase 3: Final — Bloque C (Métodos de Pago)

- [ ] **Task C1: `metodoPago` + `estadoPago` en modelo + API**
  - Campos en `Pedido`, schemas, `createPedido` setea defaults, `confirmarPago(id)` setea ambos atómicamente.
  - Aceptación: `metodoPago` requerido al crear; `estadoPago` default `pendiente`; `confirmarPago` setea `pagado` + `estado='pagado'`.
  - Verificación: `npm test` (test confirmarPago), `npm run build`.
  - Archivos: `src/types/index.ts`, `src/api/schemas.ts`, `src/api/pedidos.ts`, `src/hooks/usePedidos.ts`, `tests/api/pedidos.test.ts`.
  - Dependencias: B1 (estado `pagado`).
  - Scope: M (5 archivos).

- [ ] **Task C2: UI método de pago en `PedidoForm` + `PedidoList`**
  - Selector de `metodoPago` en form. Badge/indicador en list. Botón "Confirmar pago" para métodos diferidos.
  - Aceptación: Form requiere método; list muestra método + estado pago; botón confirma pago.
  - Verificación: `npm run build`, verificación manual.
  - Archivos: `src/components/PedidoForm.tsx`, `src/components/PedidoList.tsx`, `src/components/PedidoList.module.css`.
  - Dependencias: C1.
  - Scope: M (3 archivos).

### Checkpoint: Bloque C
- [ ] `npm test` pasa (tests métodos de pago)
- [ ] `npm run build` sin errores
- [ ] Flujo: crear pedido efectivo (pagado) → crear pedido tarjeta (pendiente) → confirmar pago tarjeta

### Fase 4: Verificación final

- [ ] **Task V1: Migración de datos unificada**
  - Script one-shot: `pendiente→creado`, `cliente: string→clienteId+snapshots`, defaults `metodoPago`/`estadoPago`.
  - Aceptación: Pedidos existentes migrados sin pérdida.
  - Verificación: Ejecutar script, verificar en Firebase Console.
  - Archivos: `scripts/migrar-pedidos-v2.ts` (o `.js`).
  - Dependencias: A3, B1, C1.
  - Scope: S (1 archivo).

- [ ] **Task V2: Tests de integración + build + lint final**
  - Tests E2E de flujos cruzados (cliente → delivery → estados → pago). Build + lint.
  - Aceptación: `npm test`, `npm run build`, `npm run lint` pasan.
  - Verificación: Comandos anteriores.
  - Archivos: `tests/integration/pedidos-flujo.test.ts`.
  - Dependencias: Todos.
  - Scope: M (1-2 archivos).

### Checkpoint: Complete
- [ ] Todos los success criteria cumplidos
- [ ] `npm test`, `npm run build`, `npm run lint` pasan
- [ ] Firestore Rules desplegadas en producción
- [ ] Migración ejecutada

## Risks and Mitigations

| Risk | Impact | Mitigación |
|------|--------|------------|
| 5 planes modifican `src/api/pedidos.ts` | Crítico | Reescritura coordinada en Fase 1-2, no merges independientes |
| `setDoc` borra campos de auditoría | Alto | `cambiarEstadoPedido` usa `updateDoc` + `arrayUnion` |
| Firestore Rules no verifican `usuariosPermitidos` | Alto | Task B5 cierra brecha; auditar doc IDs lowercase antes |
| Race condition en aviso de dirección duplicada | Bajo | Aceptable MVP; el aviso es informativo, no crítico |
| Migración de datos legacy corrupta datos | Alto | Script unificado (Task V1) con backup previo |
| Layout de PedidoList con muchas columnas | Medio | Planificar columnas colapsables/expandibles |
| Doc IDs `usuariosPermitidos` no coinciden con email token | Alto | Auditar y normalizar antes de desplegar B5 |

## Open Questions (no bloqueantes, resolver durante implementación)

- ¿Transiciones de estados restringidas o libres? → Decisión: restringidas (ver tabla arriba).
- ¿`cancelado` reversible? → No.
- ¿`entregado` reversible? → No.
- ¿Roles diferenciados o todos los autorizados cambian estado? → Todos los autorizados (MVP).
- ¿Lista final de métodos de pago? → `efectivo | tarjeta | transferencia` (confirmar con Anto).
- ¿Delivery único por día, por tanda, o por sesión? → **Resuelto: delivery por pedido, cada uno suma $1.300. Aviso informativo si hay otro con misma dirección.**
- ¿Costo de delivery ($1.300) configurable o fijo? → Fijo en MVP (confirmar con Anto).
- ¿Selector de cliente carga todos o usa autocomplete? → Cargar todos en MVP.
- ¿Mostrar historial completo de estados o solo último? → Último + expandible.

## Parallelization Opportunities

- **Fase 1**: A1 → (A2 || A3) → A4. A2 y A3 paralelizables tras A1.
- **Fase 2**: B3 (guard de rutas) es independiente, puede ir en paralelo con B1. B2, B6, B7 dependen de B1/B4.
- **Fase 3**: C1 depende de B1. C2 depende de C1.
- **Secuencial obligatorio**: A1 → A3 → A4; B1 → {B2, B4, B6}; B4+B1 → B5; B1 → C1 → C2.
