# Revisión de Planes — app_Colaciones

## Resumen ejecutivo

**VEREDICTO: Los 6 planes tienen CONFLICTOS CRÍTICOS que deben resolverse antes de la implementación.**

Los planes no son coherentes entre sí en tres áreas fundamentales:
1. **Modelo de datos de `Pedido`**: Req 1 elimina `cliente: string` pero Req 2 asume que sigue existiendo.
2. **EstadoPedido**: Req 4 asume el enum antiguo (`pendiente | entregado | cancelado`) pero Req 3 lo cambia completamente.
3. **Modificaciones a `updatePedido`**: Req 2, 4, 5 y 6 todos modifican la misma función sin coordinación.

**Requiere ajustes mayores antes de proceder.** No se recomienda implementar sin resolver estos conflictos.

---

## 1. Conflictos de modelo de datos

### Tabla de campos nuevos en `Pedido` por requisito

| Campo | Req que lo añade | Tipo | Conflictos |
|-------|------------------|------|------------|
| `clienteId` | Req 1, Req 2 | `string` | **CONFLICTO CRÍTICO**: Req 1 dice eliminar `cliente: string`, Req 2 mantiene `cliente: string` en código |
| `clienteDireccion` | Req 1 | `string` | Sin conflicto aparente |
| `clienteContacto` | Req 1 | `string` | Sin conflicto aparente |
| `clienteNombre?` | Req 1 | `string \| null` | Sin conflicto aparente |
| `tipoEntrega` | Req 2 | `'delivery' \| 'retiro'` | Sin conflicto aparente |
| `deliveryCost` | Req 2 | `number` (0 \| 1300) | Sin conflicto aparente |
| `estadoActualizadoPor` | Req 4 | `string` | Sin conflicto aparente |
| `estadoActualizadoEn` | Req 4 | `string` (ISO timestamp) | Sin conflicto aparente |
| `historialEstados` | Req 4 | `CambioEstado[]` | Sin conflicto aparente |
| `metodoPago` | Req 6 | `'efectivo' \| 'tarjeta' \| 'transferencia'` | Sin conflicto aparente |
| `estadoPago` | Req 6 | `'pendiente' \| 'pagado'` | **CONFLICTO SEMÁNTICO**: Relación con `estado === 'pagado'` del Req 3 no está clara |

### CONFLICTO CRÍTICO #1: Campo `cliente` en Pedido
- **Req 1**: elimina `cliente: string` y añade `clienteId` + snapshots
- **Req 2**: mantiene `cliente: string` en código de ejemplo
- **Resolución**: Req 2 debe usar `clienteId` + snapshots (alineado con Req 1). Implementar Req 1 antes que Req 2.

### CONFLICTO CRÍTICO #2: EstadoPedido en Req 4
- **Req 3**: cambia enum a `creado | pagado | programado | entregando | entregado | cancelado`
- **Req 4**: asume enum antiguo en `CambioEstado`
- **Resolución**: Implementar Req 3 antes que Req 4. Req 4 usa el nuevo enum.

### CONFLICTO SEMÁNTICO: `estadoPago` vs `estado === 'pagado'`
- **Req 3**: introduce estado `pagado` en el flujo
- **Req 6**: introduce `estadoPago: 'pendiente' | 'pagado'` como campo separado
- **Resolución**: `estadoPago` es la fuente de verdad del pago; `estado === 'pagado'` es su proyección. La acción "marcar como pagado" setea ambos atómicamente.

---

## 2. Archivos compartidos

| Archivo | Reqs que lo tocan | Riesgo | Mitigación |
|---------|-------------------|--------|------------|
| `src/types/index.ts` | Req 1, 2, 3, 5, 6 | ALTO | Coordinar orden: Req 1 → Req 3 → Req 2 → Req 5 → Req 6 |
| `src/api/schemas.ts` | Req 1, 2, 3, 6 | ALTO | Unificar cambios en un solo task coordinado |
| `src/api/pedidos.ts` | Req 1, 2, 4, 5, 6 | **CRÍTICO** | Reescribir de una vez con todas las funcionalidades |
| `src/hooks/usePedidos.ts` | Req 1, 2, 3, 4, 5, 6 | ALTO | Definir contrato claro de `changeEstado` |
| `src/components/PedidoForm.tsx` | Req 1, 2, 6 | MEDIO | Cambios aditivos, planificar layout |
| `src/components/PedidoList.tsx` | Req 1, 3, 4, 5, 6 | ALTO | Planificar layout de columnas |
| `firestore.rules` | Req 4, 5 | ALTO | Combinar reglas en un solo deploy |

### Análisis: `src/api/pedidos.ts` (CRÍTICO)
5 planes modifican funciones en este archivo. Recomendación: reescribir coordinadamente dividiendo en funciones especializadas:
- `createPedido` → lógica de delivery + estadoPago
- `updatePedido` → validación de estado + preservación de campos
- `cambiarEstadoPedido` → auditoría (Req 4)
- `confirmarPago` → pagos (Req 6)
- `deletePedido` → validación de estado (Req 5)

---

## 3. Grafo de dependencias y orden recomendado

```
Fase 1 (fundacional):  Req 1 (clientes) → Req 3 (estados)
Fase 2 (coordinados):  Req 2 (delivery) | Req 4 (permisos) | Req 5 (bloqueo)
Fase 3 (final):        Req 6 (pagos)
```

| Req | Depende de | Tipo | ¿Declarado? |
|-----|------------|------|-------------|
| Req 2 | Req 1 (`clienteId`) | DURA | Sí |
| Req 3 | Ninguno | - | - |
| Req 4 | Req 3 (EstadoPedido) | DURA | NO — debe corregirse |
| Req 5 | Req 3 (EstadoPedido) | DURA | Sí |
| Req 5 | Req 4 (transiciones) | MEDIA | Sí |
| Req 6 | Req 3 (estado `pagado`) | DURA | Sí |

---

## 4. Lagunas detectadas

### ALTA
1. **Coordinación de `updatePedido`**: 5 planes modifican la misma función sin coordinación. → Crear task de coordinación.
2. **Migración de datos legacy**: Req 1 (cliente→clienteId), Req 3 (pendiente→creado), Req 6 (defaults metodoPago/estadoPago). No hay plan coordinado. → Script de migración unificado.
3. **Firestore Rules combinadas**: Req 4 (auth) y Req 5 (bloqueo entregado) modifican las mismas rules. → Combinar en un solo deploy.

### MEDIA
4. **Layout de PedidoList**: muchas columnas nuevas (cliente, entrega, pago, estado, auditoría). → Planificar layout.
5. **`estadoPago` vs `estado === 'pagado'`**: falta regla de sincronización explícita. → Definir y documentar.

### BAJA
6. **Tests de integración**: no hay tests E2E de interacción entre requisitos. → Añadir post-implementación.

---

## 5. Inconsistencias de naming/convención

1. **`cliente` vs `clienteId`** — ALTA: Req 1 elimina `cliente`, Req 2 lo mantiene. Resolver alineando Req 2.
2. **`metodoPago`** — BAJA: naming OK, mantener por consistencia con `tipoEntrega`.
3. **`tipoEntrega`** — NINGUNA: consistente.
4. **Helpers de dominio duplicados** — MEDIA: Req 3 (`puedeTransicionar`), Req 5 (`esEditable`, `esEliminable`, `esTerminal`). Centralizar en `src/utils/pedidoEstado.ts`.

---

## 6. Riesgos de seguridad

1. **Firestore Rules no verifican `usuariosPermitidos`** — ALTO: `isAuthedAdmin()` solo verifica `request.auth != null`. Req 4 Task 4.2 cierra la brecha.
2. **Req 5 bloquea UI pero rules no se actualizan** — ALTO: bypass por SDK directo. Req 5 Task 5.6 debe ir en el mismo deploy que la UI.
3. **`setDoc` en `updatePedido` borra auditoría** — ALTO: Req 4 crea `cambiarEstadoPedido` separado con `updateDoc`. Los demás planes deben respetar esta separación.
4. **Race condition en delivery único** — MEDIO: dos pedidos delivery simultáneos pueden cobrar $1.300 ambos. Aceptable para MVP, documentar.
5. **Doc IDs de `usuariosPermitidos` vs email del token** — ALTO: `auth.tsx` hace `email.toLowerCase()` pero las rules no. Auditar antes de desplegar Req 4.

---

## 7. Recomendaciones de fusión

1. **Req 3 + Req 4 + Req 5 → "Estados, Permisos y Bloqueo"**: altamente acoplados vía `EstadoPedido` y Firestore Rules.
2. **Req 1 + Req 2 → "Clientes y Delivery"**: Req 2 depende duramente de `clienteId` de Req 1. Mergear elimina el fallback frágil.
3. **`src/api/pedidos.ts` → Reescritura coordinada**: 5 planes lo modifican.
4. **Req 6 puede permanecer separado**: solo depende del estado `pagado` de Req 3.

---

## 8. Open questions consolidadas

### CRÍTICAS (bloquean implementación)
1. ¿Req 2 debe esperar a Req 1 o usar fallback temporal? → **Decisión: implementar Req 1 antes que Req 2 (fusionar).**
2. ¿Relación entre `estadoPago` (Req 6) y `estado === 'pagado'` (Req 3)? → **Decisión: `estadoPago` es fuente de verdad; `estado='pagado'` es derivado. Sincronización atómica.**
3. ¿Doc IDs de `usuariosPermitidos` coinciden con email del token? → **Acción: auditar y normalizar a minúsculas antes de desplegar Req 4.**

### No bloqueantes (resolver durante implementación)
4. ¿Transiciones de estados restringidas o libres? (Req 3)
5. ¿Se incluye `programado` en el flujo? (Req 3)
6. ¿Labels de UI iguales al token o distintos? (Req 3)
7. ¿Migración automática o manual de estados? (Req 3)
8. ¿`cancelado` reversible? (Req 3, Req 5)
9. ¿Roles diferenciados o todos los autorizados pueden cambiar estado? (Req 4)
10. ¿Mostrar historial completo o solo último cambio? (Req 4)
11. ¿`cambiadoPor` almacena email o uid? (Req 4)
12. ¿Se puede revertir `entregado`? (Req 5) → **Decisión: No.**
13. ¿`cancelado` permite edición? (Req 5) → **Decisión: No, pero permite eliminación.**
14. ¿Auditoría al eliminar `cancelado`? (Req 5) → **Decisión: No en MVP.**
15. ¿Botones deshabilitados o ocultos? (Req 5) → **Decisión: Deshabilitar.**
16. ¿Lista final de métodos de pago? (Req 6)
17. ¿Retroceso de pago (de `pagado` a `pendiente`)? (Req 6)
18. ¿`metodoPago` editable después de crear? (Req 6)
19. ¿Múltiples métodos de pago por pedido? (Req 6)
20. ¿Fecha/hora de pago para auditoría? (Req 6)
21. ¿Monto pagado vs total (pagos parciales)? (Req 6)
22. ¿`creadoPor`/`actualizadoEn` en `clientes`? (Req 1)
23. ¿`findOrCreateCliente` normaliza direccion/contacto? (Req 1)
24. ¿Impedir `deleteCliente` si tiene pedidos referenciando? (Req 1)
25. ¿Migración de `contacto` desde `cliente: string`? (Req 1)
26. ¿Selector de cliente carga todos o usa autocomplete? (Req 1)
27. ¿Índice compuesto Firestore en `(direccion, contacto)`? (Req 1)
28. ¿Delivery único por día, por tanda, o por sesión? (Req 2)
29. ¿Qué pasa si el pedido con delivery cobrado se cambia a retiro o se elimina? (Req 2)
30. ¿Modelar dirección de entrega en Padre Hurtado? (Req 2)
31. ¿Costo de delivery ($1.300) configurable o fijo? (Req 2)

---

## Conclusión

Los 6 planes tienen una base sólida pero requieren **coordinación explícita** antes de la implementación. Los conflictos críticos en el modelo de datos de `Pedido` y las modificaciones concurrentes a `src/api/pedidos.ts` son los riesgos más altos.

**Recomendación final:**
1. Resolver los conflictos de modelo de datos (cliente vs clienteId, EstadoPedido)
2. Coordinar las modificaciones a `src/api/pedidos.ts` en un solo task
3. Fusionar Req 3+4+5 y Req 1+2 para reducir acoplamiento
4. Resolver las open questions críticas antes de comenzar
5. Crear un plan de migración de datos coordinado
