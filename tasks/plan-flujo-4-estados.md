# Implementation Plan: Flujo de pedidos a 4 estados

## Overview

Simplificar el flujo de pedidos de 6 estados a 4 (`creado`, `pagado`,
`finalizado`, `cancelado`), eliminando `programado`, `entregando` y
`entregado`, y reemplazando este último por `finalizado`.

## Architecture Decisions

- **`finalizado` reemplaza a `entregado`** como estado terminal de éxito.
  Hereda su semántica de "pedido completado" y sus reglas de bloqueo
  (no editable, no eliminable).
- **`src/utils/pedidoEstado.ts` sigue siendo la única fuente de verdad**
  del flujo. El tipo, el schema y las reglas de Firestore se alinean con él.
- **No se hace migración de datos** en este cambio. Si hay documentos
  legacy con estados eliminados, Firestore los rechazará en escritura
  (no en lectura); se migrarán manualmente si aparecen.

## Task List

### Phase 1: Tests (RED)

- [ ] Task 1: Actualizar `tests/utils/pedidoEstado.test.ts` al flujo de 4 estados
- [ ] Task 2: Actualizar `tests/api/pedidos.test.ts` al flujo de 4 estados
- [ ] Task 3: Actualizar `tests/rules/firestore.rules.test.ts` al flujo de 4 estados

### Checkpoint: RED
- [ ] Tests fallan (confirman que el código aún tiene el flujo viejo)

### Phase 2: Código de dominio (GREEN)

- [ ] Task 4: Actualizar `src/types/index.ts` (EstadoPedido)
- [ ] Task 5: Actualizar `src/api/schemas.ts` (EstadoPedidoSchema)
- [ ] Task 6: Actualizar `src/utils/pedidoEstado.ts` (transiciones, terminales, labels)
- [ ] Task 7: Actualizar `firestore.rules` (isValidEstado + bloqueo por finalizado)

### Checkpoint: GREEN
- [ ] `npm test` pasa
- [ ] `npm run test:rules` pasa

### Phase 3: UI y estilos

- [ ] Task 8: Actualizar `src/styles/global.css` (tokens de estado)
- [ ] Task 9: Actualizar `src/components/PedidoList.module.css` (selectores data-estado)
- [ ] Task 10: Actualizar `src/preview.tsx` (datos de muestra)
- [ ] Task 11: Actualizar `src/pages/PedidosPage.tsx` (copy del header)

### Checkpoint: Complete
- [ ] `npm run build` pasa
- [ ] `npm run lint` pasa
- [ ] No quedan referencias a programado/entregando/entregado en src/

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Datos legacy en Firestore con estados eliminados | Medio | Asumir que no hay; migrar manualmente si aparecen |
| Tests de reglas requieren emulador Firebase | Bajo | Documentar `npm run test:rules`; los tests unitarios cubren la lógica de dominio |

## Open Questions

- ¿Migrar datos legacy? Ver spec.
