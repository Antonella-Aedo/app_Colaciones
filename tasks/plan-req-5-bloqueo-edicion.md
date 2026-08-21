# Plan Req 5: Pedido editable solo si no está entregado

## Resumen

El Requisito 5 establece que un pedido **no puede editarse ni eliminarse** una vez que su estado es `entregado`. Actualmente `PedidoList.tsx` muestra los botones "Editar" y "Eliminar" siempre visibles, `usePedidos.ts` expone `update`/`remove`/`changeEstado` sin validación de estado, y `api/pedidos.ts` ejecuta `updatePedido`/`deletePedido` sin verificar el estado del documento. Las reglas de Firestore (`firestore.rules`) tampoco restringen escritura según estado.

Este plan implementa **defensa en profundidad** en tres capas: (1) UI — deshabilitar/ocultar botones según estado, (2) API/hook — rechazar operaciones con error explícito, (3) Firestore Rules — bloquear update/delete cuando `estado == 'entregado'`. Se introducen helpers de dominio `esEditable(estado)` y `esEliminable(estado)` como única fuente de verdad para la matriz estado × acción, consumidos por UI y API para evitar lógica duplicada y divergente.

## Decisiones de arquitectura

- **Defensa en profundidad (UI + API + Rules):** No se confía solo en la UI. Si un usuario bypassa el frontend (consola, llamada directa a Firestore, herramienta externa), la capa API y las reglas de Firestore deben rechazar la operación. Tres capas independientes deben fallar para que un pedido entregado se modifique.
- **Helpers de dominio centralizados:** `esEditable(estado: EstadoPedido): boolean` y `esEliminable(estado: EstadoPedido): boolean` en `src/types/index.ts` (o un nuevo `src/utils/pedidoEstado.ts`). UI, hooks y API los consumen. Una sola función define la política; todos la referencian. Evita que cada capa reimplemente la matriz y diverja.
- **Matriz estado × acción (fuente de verdad):**

  | Estado        | Editar (items/cliente/total) | Eliminar | Cambiar estado |
  |---------------|:----------------------------:|:--------:|:--------------:|
  | `creado`      | ✅ Sí                        | ✅ Sí    | ✅ Sí          |
  | `pagado`      | ✅ Sí                        | ✅ Sí    | ✅ Sí          |
  | `programado`  | ✅ Sí                        | ✅ Sí    | ✅ Sí          |
  | `entregando`  | ✅ Sí                        | ✅ Sí    | ✅ Sí          |
  | `entregado`   | ❌ No                        | ❌ No    | ❌ No (final)  |
  | `cancelado`   | ❌ No                        | ✅ Sí    | ❌ No (final)  |

- **`entregado` es estado terminal:** Una vez entregado, no se puede revertir a otro estado. Ni edición de campos ni cambio de estado. Justificación: un pedido entregado representa un hecho consumado (la colación ya se entregó al cliente); revertirlo requeriría un proceso de anulación/rectificación que está fuera del alcance del MVP.
- **`cancelado` es estado terminal para edición pero permite eliminación:** Un pedido cancelado no debería editarse (su cancelación es una decisión registrada; editar sus items/cliente alteraría el registro histórico). Sin embargo, sí puede eliminarse para limpieza (un cancelado es un registro que no se concretó y puede purgarse). Si se desea reabrir un pedido cancelado, sería un caso de negocio futuro (open question).
- **Separación edición vs. cambio de estado:** `updatePedido` (edita items/cliente/total) y `changeEstado` (cambia solo `estado`) son operaciones distintas. El bloqueo aplica a ambas cuando el estado es terminal (`entregado` o `cancelado`). `changeEstado` además rechaza transiciones desde estados terminales (no se puede salir de `entregado` ni `cancelado`).
- **Mensajes de error explícitos:** Las capas API y hook lanzan errores con mensajes claros en español (ej. `"No se puede editar un pedido entregado"`), que la UI puede mostrar al usuario.
- **Coordinación con Req 3 (estados) y Req 4 (flujo de estados):** La lista final de estados (`creado | pagado | programado | entregando | entregado | cancelado`) proviene del Req 3. Las transiciones válidas provienen del Req 4. Este plan (Req 5) define qué acciones están bloqueadas según estado, pero asume que la lista de estados y las transiciones ya están definidas. Si Req 3/4 no están listos, este plan puede implementarse con los estados actuales (`pendiente | entregado | cancelado`) y ajustarse después.

## Cambios al modelo de datos

- **No hay cambios al schema de Firestore.** Los campos de `Pedido` permanecen igual. El estado ya existe como campo.
- **Nuevos helpers de dominio** en `src/types/index.ts` (junto a `EstadoPedido`) o en un nuevo `src/utils/pedidoEstado.ts`:

  ```typescript
  // Estados desde los que NO se puede editar ni cambiar estado (terminales)
  export const ESTADOS_TERMINALES: EstadoPedido[] = ['entregado', 'cancelado'];

  // Estados desde los que NO se puede eliminar
  export const ESTADOS_NO_ELIMINABLES: EstadoPedido[] = ['entregado'];

  export function esEditable(estado: EstadoPedido): boolean {
    return !ESTADOS_TERMINALES.includes(estado);
  }

  export function esEliminable(estado: EstadoPedido): boolean {
    return !ESTADOS_NO_ELIMINABLES.includes(estado);
  }

  export function esTerminal(estado: EstadoPedido): boolean {
    return ESTADOS_TERMINALES.includes(estado);
  }
  ```

- **`EstadoPedido` se expande** (coordinado con Req 3): de `'pendiente' | 'entregado' | 'cancelado'` a `'creado' | 'pagado' | 'programado' | 'entregando' | 'entregado' | 'cancelado'`. El `EstadoPedidoSchema` en `src/api/schemas.ts` y `isValidEstado` en `firestore.rules` deben actualizarse en consecuencia. Este plan asume que Req 3 ya hizo ese cambio o lo hace en paralelo; si no, los helpers funcionan con la lista actual y se ajustan al mergear Req 3.
- **`PedidoInput` sin cambios estructurales:** `estado` sigue siendo opcional en `PedidoInput`. La validación de bloqueo se hace leyendo el estado actual del documento antes de escribir, no desde el input.

## Tareas (vertical slices, <5 archivos c/u)

### Task 5.1: Helpers de dominio `esEditable` / `esEliminable` / `esTerminal`

**Description:** Crear las funciones de dominio que encapsulan la matriz estado × acción. Estas son la única fuente de verdad para qué estados bloquean edición, eliminación y cambio de estado. Todos los consumidores (UI, hooks, API) las importarán.

**Acceptance criteria:**
- [ ] `esEditable('entregado')` retorna `false`
- [ ] `esEditable('cancelado')` retorna `false`
- [ ] `esEditable('creado')` / `'pagado')` / `'programado')` / `'entregando')` / `'pendiente')` retornan `true`
- [ ] `esEliminable('entregado')` retorna `false`
- [ ] `esEliminable('cancelado')` retorna `true`
- [ ] `esEliminable` retorna `true` para todos los estados no-entregados
- [ ] `esTerminal('entregado')` y `esTerminal('cancelado')` retornan `true`; el resto `false`
- [ ] Los helpers están tipados con `EstadoPedido` (sin `string` suelto)
- [ ] Hay tests unitarios cubriendo todos los estados

**Verification:**
- [ ] Tests pasan: `npm test -- --run tests/utils/pedidoEstado` (o ubicación equivalente)
- [ ] Build succeeds: `npm run build`
- [ ] `npm run lint` sin errores

**Dependencies:** Req 3 (lista final de estados). Si Req 3 no está listo, implementar con estados actuales y marcar como ajuste pendiente.

**Files likely touched:**
- `src/types/index.ts` (añadir helpers junto a `EstadoPedido`) o nuevo `src/utils/pedidoEstado.ts`
- `tests/utils/pedidoEstado.test.ts` (nuevo)

**Estimated scope:** Small (1-2 archivos)

---

### Task 5.2: Bloqueo en capa API (`updatePedido` / `deletePedido`)

**Description:** Modificar `src/api/pedidos.ts` para que `updatePedido` y `deletePedido` verifiquen el estado actual del documento antes de operar. Si el pedido está en un estado no editable / no eliminable, lanzar un error con mensaje claro. Esto es la segunda línea de defensa (después de UI, antes de Firestore Rules).

**Acceptance criteria:**
- [ ] `updatePedido(id, input)` lee el documento actual; si `estado === 'entregado'` o `estado === 'cancelado'`, lanza `Error("No se puede editar un pedido [estado]")` antes de escribir
- [ ] `deletePedido(id)` lee el documento actual; si `estado === 'entregado'`, lanza `Error("No se puede eliminar un pedido entregado")` antes de borrar
- [ ] `deletePedido` permite eliminar pedidos `cancelado` (no lanza error)
- [ ] El error se lanza **antes** de cualquier escritura a Firestore (no se llama `setDoc`/`deleteDoc` si el estado bloquea)
- [ ] Si el documento no existe, `updatePedido` lanza `Error("Pedido no encontrado")` (comportamiento consistente)
- [ ] Tests unitarios mockeando Firestore cubren: editar entregado (rechazado), editar cancelado (rechazado), editar pendiente/creado (permitido), eliminar entregado (rechazado), eliminar cancelado (permitido), eliminar pendiente (permitido), documento inexistente

**Verification:**
- [ ] Tests pasan: `npm test -- --run tests/api/pedidos`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: intentar editar un pedido entregado vía consola llama a `updatePedido` y recibe error

**Dependencies:** Task 5.1 (helpers de dominio)

**Files likely touched:**
- `src/api/pedidos.ts`
- `tests/api/pedidos.test.ts` (extender tests existentes o crear)

**Estimated scope:** Small (2 archivos)

---

### Task 5.3: Bloqueo en hook `usePedidos` (`update` / `remove` / `changeEstado`)

**Description:** El hook `usePedidos.ts` expone `update`, `remove` y `changeEstado`. Estas funciones deben propagar los errores de la capa API (Task 5.2) y, además, hacer una validación optimista en el cache local (`pedidos`) para feedback inmediato en UI sin esperar el round-trip a Firestore. `changeEstado` además rechaza transiciones desde estados terminales.

**Acceptance criteria:**
- [ ] `update(id, input)` verifica `esEditable(pedido.estado)` en el cache local antes de llamar a la API; si no es editable, lanza `Error("No se puede editar un pedido [estado]")` sin llamar a la API
- [ ] `remove(id)` verifica `esEliminable(pedido.estado)` en el cache local; si no es eliminable, lanza error sin llamar a la API
- [ ] `changeEstado(id, nuevoEstado)` verifica `esTerminal(pedido.estado)`; si el pedido está en estado terminal, lanza `Error("No se puede cambiar el estado de un pedido [estado]")` sin llamar a la API
- [ ] Los errores de la capa API (ej. documento fue entregado entre fetch y update — race condition) se propagan al caller
- [ ] El estado en cache se actualiza solo si la API responde exitosamente
- [ ] Tests del hook cubren: update de entregado (rechazado en cache), update de cancelado (rechazado en cache), remove de entregado (rechazado), remove de cancelado (permitido), changeEstado desde entregado (rechazado), changeEstado desde cancelado (rechazado), changeEstado desde pendiente (permitido)

**Verification:**
- [ ] Tests pasan: `npm test -- --run tests/hooks/usePedidos`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 5.1 (helpers), Task 5.2 (capa API)

**Files likely touched:**
- `src/hooks/usePedidos.ts`
- `tests/hooks/usePedidos.test.ts` (nuevo o extender)

**Estimated scope:** Small (2 archivos)

---

### Task 5.4: Bloqueo en UI (`PedidoList` — deshabilitar botones)

**Description:** En `PedidoList.tsx`, los botones "Editar" y "Eliminar" deben deshabilitarse (o ocultarse) según el estado del pedido, usando los helpers de dominio. El `<select>` de cambio de estado también debe deshabilitarse si el pedido está en estado terminal. Se añade feedback visual (tooltip/aria-label) explicando por qué está deshabilitado.

**Acceptance criteria:**
- [ ] Botón "Editar" tiene `disabled={!esEditable(p.estado)}` — deshabilitado si `entregado` o `cancelado`
- [ ] Botón "Eliminar" tiene `disabled={!esEliminable(p.estado)}` — deshabilitado si `entregado`, habilitado si `cancelado`
- [ ] `<select>` de estado tiene `disabled={esTerminal(p.estado)}` — deshabilitado si `entregado` o `cancelado`
- [ ] Los botones deshabilitados tienen `title`/`aria-label` explicativo (ej. "No se puede editar un pedido entregado")
- [ ] Estilos CSS: botones deshabilitados se ven claramente deshabilitados (opacidad, cursor not-allowed) — verificar `PedidoList.module.css`
- [ ] El componente no llama a `onEdit`/`onDelete`/`onChangeEstado` cuando está deshabilitado (doble seguridad: `disabled` + guard en handler)
- [ ] Tests de componente: render con pedido `entregado` → botón Editar deshabilitado, botón Eliminar deshabilitado, select deshabilitado; render con pedido `cancelado` → Editar deshabilitado, Eliminar habilitado; render con pedido `pendiente` → ambos habilitados

**Verification:**
- [ ] Tests pasan: `npm test -- --run tests/components/PedidoList`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: en navegador, pedido entregado muestra botones grises/no clicables; hover muestra tooltip explicativo

**Dependencies:** Task 5.1 (helpers)

**Files likely touched:**
- `src/components/PedidoList.tsx`
- `src/components/PedidoList.module.css` (estilos para disabled)
- `tests/components/PedidoList.test.tsx` (nuevo o extender)

**Estimated scope:** Medium (3 archivos)

---

### Task 5.5: Bloqueo en `PedidoForm` (guarda defensivo si se abre un pedido no editable)

**Description:** Aunque la UI (Task 5.4) deshabilita el botón "Editar", `PedidoForm` recibe `inicial?: Pedido | null`. Por defensa en profundidad, si por algún motivo (ruta directa, estado en cache desactualizado) se renderiza el formulario con un pedido no editable, el submit debe bloquearse y mostrar un mensaje. El formulario pasa a modo read-only o muestra un banner "Este pedido no se puede editar (estado: entregado)".

**Acceptance criteria:**
- [ ] Si `inicial` existe y `!esEditable(inicial.estado)`, el formulario muestra un banner/aviso "Este pedido está [estado] y no se puede editar"
- [ ] El botón "Guardar cambios" está deshabilitado si `inicial` no es editable
- [ ] Los campos del formulario pueden permanecer visibles (read-only) o bloquearse — decisión: mostrar como solo lectura con `readOnly` en inputs
- [ ] `handleSubmit` verifica `esEditable` antes de llamar `onSubmit`; si no es editable, setea error y retorna sin llamar a `onSubmit`
- [ ] Tests de componente: render con `inicial.estado = 'entregado'` → banner visible, botón deshabilitado, submit no llama a `onSubmit`

**Verification:**
- [ ] Tests pasan: `npm test -- --run tests/components/PedidoForm`
- [ ] Build succeeds: `npm run build`

**Dependencies:** Task 5.1 (helpers)

**Files likely touched:**
- `src/components/PedidoForm.tsx`
- `src/components/PedidoForm.module.css` (estilo banner/aviso)
- `tests/components/PedidoForm.test.tsx` (extender)

**Estimated scope:** Medium (3 archivos)

---

### Task 5.6: Bloqueo en Firestore Rules (update/delete si `entregado`)

**Description:** Modificar `firestore.rules` para que la colección `pedidos` rechaze `update` y `delete` cuando el documento existente tenga `estado == 'entregado'`. Esto es la tercera línea de defensa. Se coordina con Req 4 (reglas de estados). Para `delete`, solo se bloquea `entregado` (cancelado sí se puede eliminar).

**Acceptance criteria:**
- [ ] `update` en `/pedidos/{pedidoId}` rechazado si `resource.data.estado == 'entregado'` (el documento actual está entregado)
- [ ] `update` en `/pedidos/{pedidoId}` rechazado si `resource.data.estado == 'cancelado'` (no se puede editar cancelado)
- [ ] `delete` en `/pedidos/{pedidoId}` rechazado si `resource.data.estado == 'entregado'`
- [ ] `delete` en `/pedidos/{pedidoId}` permitido si `resource.data.estado == 'cancelado'`
- [ ] `create` no se ve afectado (siempre permitido si pasa `pedidoValido()`)
- [ ] `update` desde un estado no terminal sigue permitido (incluyendo cambiar a `entregado` o `cancelado` — eso es el flujo de Req 3/4)
- [ ] La función auxiliar `esEditableEstado(estado)` se define en las rules para legibilidad
- [ ] Se actualiza `isValidEstado` para incluir la lista expandida de estados (Req 3) si aplica
- [ ] Documentación inline en las rules explica la regla de bloqueo

**Verification:**
- [ ] `firebase deploy --only firestore:rules` exitoso (o validación local con `firebase emulators`)
- [ ] Test manual con emulador: intentar update/delete de pedido entregado → rechazado; update de cancelado → rechazado; delete de cancelado → permitido; update de pendiente → permitido
- [ ] Coordinar con Req 4 para no sobrescribir reglas de transición de estados

**Dependencies:** Task 5.1 (definición de estados terminales), Req 3 (lista de estados), Req 4 (reglas de transición — coordinar para no conflictos)

**Files likely touched:**
- `firestore.rules`
- `docs/firestore-rules.md` (si existe documentación de reglas — opcional)

**Estimated scope:** Small (1-2 archivos)

---

### Checkpoint: Req 5 Completo

- [ ] Todos los tests pasan: `npm test`
- [ ] Build sin errores: `npm run build`
- [ ] Lint limpio: `npm run lint`
- [ ] Verificación manual end-to-end:
  - Pedido `pendiente`/`creado`: Editar y Eliminar habilitados, cambio de estado funciona
  - Pedido `entregado`: Editar deshabilitado, Eliminar deshabilitado, cambio de estado deshabilitado
  - Pedido `cancelado`: Editar deshabilitado, Eliminar habilitado, cambio de estado deshabilitado
  - Intentar editar entregado vía consola (llamar a `updatePedido` directamente) → error
  - Intentar eliminar entregado vía consola → error
  - Firestore Rules bloquean update/delete de entregado incluso sin frontend
- [ ] Matriz estado × acción documentada y consistente en las tres capas

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Race condition: pedido pasa a `entregado` entre que la UI lo muestra como editable y el usuario guarda | Medio | La capa API lee el estado actual del doc antes de escribir (Task 5.2). El error se propaga a la UI. El hook puede refrescar el cache tras el error. |
| Req 3 expande estados pero no está mergeado → helpers usan lista incompleta | Medio | Los helpers se definen con la lista esperada (`creado | pagado | ... | cancelado`). Si Req 3 no está listo, usar lista actual y marcar TODO. Los helpers son el único punto de cambio. |
| Conflicto con Req 4 en Firestore Rules (transiciones de estado vs. bloqueo de edición) | Alto | Coordinar Task 5.6 con Req 4. El bloqueo de Req 5 usa `resource.data.estado` (estado actual del doc). Las transiciones de Req 4 validan `request.resource.data.estado` (estado destino). Ambas reglas pueden coexistir con AND. |
| `changeEstado` y `updatePedido` comparten la función API `updatePedido` → bloquear `updatePedido` podría bloquear `changeEstado` legítimo | Alto | `changeEstado` llama a `apiUpdate` que lee el estado actual. Si el estado actual es terminal, se rechaza (correcto: no se puede salir de terminal). Si el estado actual no es terminal, `updatePedido` permite la escritura (incluyendo cambiar a terminal). El bloqueo es sobre el estado **actual**, no sobre el destino. |
| Eliminar un pedido `cancelado` pierde el registro histórico | Bajo | Decisión de producto: cancelado es eliminable para limpieza. Si se requiere auditoría, cambiar `esEliminable('cancelado')` a `false` en un solo punto (helper). Documentar como open question. |
| Botones deshabilitados confunden al usuario (no sabe por qué) | Bajo | Tooltip/aria-label explicativo en Task 5.4. Banner en PedidoForm en Task 5.5. |
| Firestore Rules: `resource.data.estado` no existe en documentos legacy | Bajo | Los pedidos existentes tienen `estado` (default `pendiente`). Si hay docs sin campo, la regla `resource.data.estado == 'entregado'` evalúa false → no bloquea (seguro por defecto). |

## Dependencias con otros requisitos

- **Req 3 (estados):** Este plan depende de la lista final de estados (`creado | pagado | programado | entregando | entregado | cancelado`). Si Req 3 no está implementado, los helpers y reglas se ajustan a la lista actual (`pendiente | entregado | cancelado`) y se actualizan al mergear Req 3. El `EstadoPedidoSchema` en `schemas.ts` y `isValidEstado` en `firestore.rules` deben alinearse con Req 3.
- **Req 4 (flujo de estados / transiciones):** Task 5.6 (Firestore Rules) debe coordinarse con Req 4 para que las reglas de transición (`request.resource.data.estado` debe ser válido según el estado actual) y las reglas de bloqueo (`resource.data.estado == 'entregado'` bloquea update) coexistan sin conflicto. Ambas son condiciones AND sobre `update`.
- **Req 4 (cambio de estado):** `changeEstado` en `usePedidos.ts` ya existe. Req 4 puede añadir validación de transiciones válidas (ej. `pendiente → pagado` sí, `pendiente → entregado` no). Este plan (Req 5) añade el bloqueo de estados terminales encima. La composición es: `changeEstado` valida (a) no es terminal (Req 5) y (b) transición válida (Req 4).

## Open questions

1. **¿Se puede revertir `entregado` a otro estado?** Decisión actual: **No.** `entregado` es terminal. Justificación: un pedido entregado es un hecho consumado. Si se necesita rectificar (ej. se marcó entregado por error), sería un caso de negocio futuro (posible "anular entrega" con permiso especial). Dejar como open question para validación con el usuario/producto.
2. **¿Se puede revertir `cancelado` a otro estado (reabrir)?** Decisión actual: **No.** `cancelado` es terminal para edición y cambio de estado, pero permite eliminación. Si se necesita reabrir un cancelado, sería un caso futuro. Open question para validación.
3. **¿`cancelado` permite edición?** Decisión actual: **No.** Un cancelado no se edita (alteraría el registro de cancelación). Pero sí se elimina. Si el usuario prefiere que `cancelado` sí permita edición (para corregir antes de recancelar), cambiar `esEditable('cancelado')` a `true` en el helper — un solo punto de cambio. Open question.
4. **¿Se requiere auditoría/historial al eliminar un `cancelado`?** Actualmente no. Si se requiere soft-delete o log de eliminación, es scope futuro (Req de auditoría no contemplado en MVP).
5. **¿Los botones se deshabilitan o se ocultan?** Decisión actual: **deshabilitar** (mantiene el layout consistente y comunica que la acción existe pero no está disponible). Si se prefiere ocultar, es un cambio menor en Task 5.4. Open question de preferencia visual.
