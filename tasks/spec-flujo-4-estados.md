# Spec: Simplificación del flujo de pedidos a 4 estados

## Objective

Reducir el flujo de estados de un pedido de 6 estados
(`creado → pagado → programado → entregando → entregado`, más `cancelado`)
a 4 estados: **`creado → pagado → finalizado`**, más **`cancelado`**.

El flujo lineal actual tiene pasos intermedios (`programado`, `entregando`,
`entregado`) que para el negocio real de colaciones no agregan valor
operativo. Se reemplazan por un único estado terminal `finalizado` que
indica que el pedido fue completado.

### Transiciones válidas (nuevo flujo)

```
creado ──→ pagado
creado ──→ cancelado
pagado ──→ finalizado
pagado ──→ cancelado
finalizado ──→ (terminal)
cancelado  ──→ (terminal)
```

### Reglas de dominio

- **Terminales:** `finalizado` y `cancelado`.
- **Editable:** todo pedido no terminal (creado, pagado).
- **Eliminable:** todo pedido excepto `finalizado` (cancelado sí es eliminable).
- **Pago:** al transicionar a `pagado` se sincroniza `estadoPago = 'pagado'`
  (comportamiento existente, sin cambios).

## Commands

```bash
npm test                 # vitest run (tests unitarios + api)
npm run test:rules       # tests de firestore.rules (emulador)
npm run build            # tsc -b && vite build
npm run lint             # eslint .
```

## Project Structure (archivos afectados)

```
src/types/index.ts                       → tipo EstadoPedido
src/api/schemas.ts                       → EstadoPedidoSchema (Zod)
src/api/pedidos.ts                       → deletePedido (esEliminable)
src/utils/pedidoEstado.ts                → fuente de verdad del flujo
src/components/PedidoList.module.css     → selectores [data-estado]
src/styles/global.css                    → tokens de color por estado
src/preview.tsx                          → datos de muestra
src/pages/PedidosPage.tsx                → copy del header
firestore.rules                          → isValidEstado + bloqueo por finalizado
tests/utils/pedidoEstado.test.ts         → tests del flujo
tests/api/pedidos.test.ts                → tests de API
tests/rules/firestore.rules.test.ts      → tests de reglas
```

## Testing Strategy

- **Unitarios (`tests/utils/pedidoEstado.test.ts`):** transiciones, terminalidad,
  editabilidad, eliminabilidad, consistencia de labels/estados. Fuente de verdad.
- **API (`tests/api/pedidos.test.ts`):** cambiarEstadoPedido, bloqueo de
  edición/eliminación por `finalizado`, validación runtime del enum.
- **Reglas (`tests/rules/firestore.rules.test.ts`):** `isValidEstado` acepta
  los 4 estados y rechaza los eliminados; bloqueo de update/delete cuando
  `estado = 'finalizado'`.

TDD: primero se actualizan los tests para reflejar el nuevo flujo (RED),
luego se cambia el código de dominio/API/reglas para que pasen (GREEN).

## Boundaries

- **Always:** actualizar tests antes que el código (TDD); mantener
  `src/utils/pedidoEstado.ts` como única fuente de verdad del flujo.
- **Ask first:** migrar datos existentes en Firestore con estados legacy
  (`programado`, `entregando`, `entregado`). Por ahora se asume que no hay
  datos en producción con esos estados, o que se migrarán manualmente.
- **Never:** dejar estados legacy en el tipo/schema sin actualizar sus tests.

## Success Criteria

- [ ] `EstadoPedido` tiene exactamente 4 valores: creado, pagado, finalizado, cancelado.
- [ ] Las transiciones válidas son: creado→{pagado,cancelado}, pagado→{finalizado,cancelado}.
- [ ] `finalizado` y `cancelado` son terminales.
- [ ] No se puede editar ni eliminar un pedido `finalizado`.
- [ ] `cancelado` es eliminable.
- [ ] `firestore.rules` valida solo los 4 estados y bloquea update/delete de `finalizado`.
- [ ] `npm test` pasa (unitarios + api).
- [ ] `npm run build` pasa (sin errores de tipos).
- [ ] La UI (PedidoList, preview) no referencia estados eliminados.

## Open Questions

- ¿Migrar documentos legacy con `programado`/`entregando`/`entregado` a
  `finalizado`? Se asume que no hay datos legacy en producción por ahora.
