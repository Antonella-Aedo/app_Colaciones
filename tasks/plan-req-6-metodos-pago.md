# Plan Req 6: Métodos de Pago

## Resumen

El Requisito 6 introduce la noción de **método de pago** en el dominio `Pedido`. Hoy un pedido solo tiene `total` y `estado` (`pendiente | entregado | cancelado`). Se necesita registrar *cómo* se paga un pedido (`efectivo | tarjeta | transferencia`, lista a confirmar) y distinguir el *cómo* del *cuándo*: `efectivo` se paga al momento (puede pasar a `pagado` inmediatamente), mientras que `tarjeta` "se paga después" (el estado `pagado` se marca solo cuando se confirma el cobro, no al crear el pedido).

Esto obliga a separar dos conceptos relacionados pero distintos:
- **`metodoPago`** — *cómo* se paga/pagó (categoría).
- **`estadoPago`** — *si* ya se pagó (`pagado | pendiente`), independiente del flujo de estados de entrega del Req 3.

El estado `pagado` del flujo principal (Req 3) se **deriva** de `estadoPago === 'pagado'`: cuando un pedido queda pagado, su `estado` del flujo pasa a `pagado`. La relación es: `estadoPago` es la fuente de verdad del pago; `estado === 'pagado'` es una proyección dentro del flujo de estados de pedido.

> **Estado del requisito:** "A verificar". Este plan documenta opciones y open questions; la lista final de métodos y la forma exacta de integrar `pagado` quedan sujetas a confirmación (ver §Open questions).

## Decisiones de arquitectura

### D1: `metodoPago` y `estadoPago` son campos separados, no integrados en `EstadoPedido`

Se introduce un campo `metodoPago: MetodoPago` (cómo) y un campo `estadoPago: EstadoPago` (si: `pagado | pendiente`). No se sobrecarga `EstadoPedido` con variantes por método porque:
- El *cómo* y el *si* son dimensiones ortogonales: un pago con tarjeta puede estar `pendiente` hoy y `pagado` mañana, sin cambiar el método.
- El flujo de estados del Req 3 (`creado | pagado | programado | entregando | entregado | cancelado`) describe el ciclo de vida del pedido, no del pago. Mezclarlo generaría combinaciones explosivas (`pagado_tarjeta`, `pendiente_efectivo`...).

**Relación con estado `pagado` del Req 3:** `estadoPago === 'pagado'` ⇒ `estado === 'pagado'`. La transición inversa no es automática: `estado === 'pagado'` implica que el pedido está pagado, pero el sistema de verdad del pago es `estadoPago`. En la práctica, la acción "marcar como pagado" setea `estadoPago = 'pagado'` **y** `estado = 'pagado'` atómicamente. Cancelar el pago (`estadoPago = 'pendiente'`) retrotrae `estado` al estado previo razonable (`creado` o `programado`), decisión a confirmar en Req 3.

### D2: Default de `metodoPago` y `estadoPago` al crear

- `metodoPago`: **requerido** en `PedidoInput` (no hay pedido sin método de pago). Default propuesto: `efectivo` si se quiere mantener compatibilidad con datos legacy, pero se prefiere exigirlo explícitamente en el form.
- `estadoPago`: default `pendiente`, **excepto** cuando `metodoPago === 'efectivo'` y el operador marca "pagar ahora" → `estadoPago = 'pagado'` y `estado = 'pagado'` al crear. Para `tarjeta`/`transferencia` el default es `pendiente` (se paga después).

### D3: Acción explícita "Confirmar pago"

Para métodos diferidos (`tarjeta`, `transferencia`) se expone una acción `confirmarPago(id)` que setea `estadoPago = 'pagado'` y `estado = 'pagado'`. Esto vive en `usePedidos` y `api/pedidos.ts` como una operación focalizada (no requiere reconstruir todo el `PedidoInput`).

### D4: Lista de métodos de pago (propuesta, a confirmar)

Propuesta inicial: `efectivo | tarjeta | transferencia`. Se modela como un `enum`/union literal en TS y `z.enum` en Zod para validación runtime. Es extensible: añadir un literal + opción del select es un cambio de un punto. Si el negocio requiere métodos arbitrarios (ej. "webpay", "mach", nombres libres), se cambia a `string` con un conjunto sugerido; **decisión diferida** (ver Open questions).

### D5: Migración de datos existentes

Los pedidos actuales en Firestore no tienen `metodoPago` ni `estadoPago`. Estrategia:
- Lectura: `getPedidos`/`getPedido` aplican defaults (`metodoPago: 'efectivo'`, `estadoPago: pendiente` o `pagado` según `estado === 'entregado'`) cuando los campos faltan. Esto evita una migración obligatoria.
- Escritura: todo `createPedido`/`updatePedido` persiste los nuevos campos, con lo que los docs se "actualizan" naturalmente al editar.
- No se requiere script de migración en MVP; documentar el default de lectura en `api/pedidos.ts`.

## Cambios al modelo de datos

### `src/types/index.ts`

```ts
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoPago = 'pendiente' | 'pagado';

export interface Pedido {
  // ...campos existentes...
  metodoPago: MetodoPago;      // NUEVO
  estadoPago: EstadoPago;      // NUEVO
}

export type PedidoInput = Omit<Pedido, 'id' | 'estado'> & {
  estado?: EstadoPedido;
  estadoPago?: EstadoPago;     // opcional: createPedido lo defaultea
};
```

> `metodoPago` es requerido en `PedidoInput` (no hay pedido sin método). `estadoPago` es opcional en el input (default `pendiente`, salvo efectivo-pagar-ahora).

### `src/api/schemas.ts`

- `MetodoPagoSchema = z.enum(['efectivo','tarjeta','transferencia'])`
- `EstadoPagoSchema = z.enum(['pendiente','pagado'])`
- `PedidoSchema` y `PedidoInputSchema` añaden los campos. `PedidoInputSchema` hace `metodoPago` requerido y `estadoPago` opcional.

### `src/api/pedidos.ts`

- `createPedido`: valida, setea `estadoPago` default (`pendiente` o `pagado` si efectivo+pagar-ahora), y si `estadoPago === 'pagado'` fuerza `estado = 'pagado'`.
- `updatePedido`: preserva `estadoPago` existente si no se provee (igual que hace hoy con `estado`).
- **NUEVO** `confirmarPago(id)`: lee el doc, setea `estadoPago = 'pagado'` y `estado = 'pagado'`, persiste con `setDoc` (preservando el resto).
- Lecturas (`getPedidos`, `getPedido`, `getPedidosPaginated`): normalizan docs legacy aplicando defaults cuando faltan `metodoPago`/`estadoPago`.

### `src/hooks/usePedidos.ts`

- `create`/`update`/`changeEstado`: propagan `metodoPago` y `estadoPago`.
- **NUEVO** `confirmarPago(id)`: llama a `api.confirmarPago` y actualiza el cache.
- `changeEstado`: si se setea `estado = 'pagado'`, también setea `estadoPago = 'pagado'` (consistencia).

### `src/components/PedidoForm.tsx`

- Nuevo estado `metodoPago` (select) y `pagarAhora` (checkbox, solo habilitado cuando `metodoPago === 'efectivo'`).
- El `onSubmit` incluye `metodoPago` y, si `pagarAhora`, `estadoPago: 'pagado'`.
- Validación: `metodoPago` requerido.

### `src/components/PedidoList.tsx`

- Nueva columna "Pago" con badge de `metodoPago` + indicador de `estadoPago` (✓ pagado / ⏳ pendiente).
- Botón/acción "Confirmar pago" para pedidos con `estadoPago === 'pendiente'` (visible cuando el método es diferido).
- El select de estado existente se alinea con Req 3 (cuando `estado === 'pagado'` muestra badge de pagado).

## Tareas (vertical slices, <5 archivos c/u)

### Task 6.1: Modelo de datos + esquemas + defaults de lectura

- **Aceptación:** `MetodoPago` y `EstadoPago` existen en `types/index.ts`; `schemas.ts` los valida; `api/pedidos.ts` aplica defaults al leer docs legacy y persiste los campos al escribir; `tsc -b` pasa sin errores.
- **Verificación:** `npm run build` OK. Test unitario de `getPedidos` con doc sin `metodoPago` retorna defaults. Test de `createPedido` con `metodoPago='tarjeta'` persiste `estadoPago='pendiente'`.
- **Archivos:** `src/types/index.ts`, `src/api/schemas.ts`, `src/api/pedidos.ts`, `tests/api/pedidos.test.ts` (o equivalente existente).
- **Dependencias:** Req 3 (estado `pagado` en `EstadoPedido`) — si Req 3 no ha expandido el enum, esta task puede adelantar la adición de `'pagado'` a `EstadoPedido` o trabajar con un acuerdo temporal. **Coordina con Req 3.**
- **Scope:** solo modelo + API; sin UI.

### Task 6.2: Acción `confirmarPago` en API + hook

- **Aceptación:** `confirmarPago(id)` en `api/pedidos.ts` setea `estadoPago='pagado'` y `estado='pagado'` atómicamente; `usePedidos.confirmarPago` actualiza el cache; `changeEstado` mantiene consistencia (`estado='pagado'` ⇒ `estadoPago='pagado'`).
- **Verificación:** Test unitario de `confirmarPago` mockeando Firestore. Test de hook (RTL) verifica estado en cache tras confirmar.
- **Archivos:** `src/api/pedidos.ts`, `src/hooks/usePedidos.ts`, `tests/hooks/usePedidos.test.ts` (o equivalente).
- **Dependencias:** Task 6.1. Req 3 (usa `estado='pagado'`).
- **Scope:** lógica, sin UI.

### Task 6.3: UI — selector de método de pago en PedidoForm

- **Aceptación:** `PedidoForm` muestra un `<select>` de método de pago (requerido) y un checkbox "Pagar ahora" habilitado solo si `metodoPago==='efectivo'`; el `onSubmit` incluye `metodoPago` y `estadoPago` según corresponda; al editar, precarga los valores de `inicial`.
- **Verificación:** Test de componente: render del select, validación de requerido, checkbox deshabilitado para tarjeta, submit envía payload correcto. `npm run lint` OK.
- **Archivos:** `src/components/PedidoForm.tsx`, `src/components/PedidoForm.module.css`, `tests/components/PedidoForm.test.tsx` (o equivalente).
- **Dependencias:** Task 6.1.
- **Scope:** solo formulario.

### Task 6.4: UI — indicador de pago y acción "Confirmar pago" en PedidoList

- **Aceptación:** `PedidoList` muestra columna "Pago" con badge de método + estado de pago (✓/⏳); botón "Confirmar pago" para pedidos `estadoPago==='pendiente'`; invoca `onConfirmarPago(id)` (nueva prop). El orquestador (`App.tsx` o contenedor) cablea `usePedidos.confirmarPago`.
- **Verificación:** Test de componente: badge correcto por método/estado, botón visible solo cuando pendiente, click dispara callback. `npm run build` OK.
- **Archivos:** `src/components/PedidoList.tsx`, `src/components/PedidoList.module.css`, `src/App.tsx` (cableado), `tests/components/PedidoList.test.tsx` (o equivalente).
- **Dependencias:** Task 6.2, Task 6.3.
- **Scope:** solo lista + cableado.

### Task 6.5: Alineación con Req 3 y documentación

- **Aceptación:** La transición `estadoPago='pagado'` ⇄ `estado='pagado'` está documentada en `docs/spec.md` (sección Pedidos) y en comentarios de `api/pedidos.ts`; `EstadoPedido` incluye `'pagado'` (coordinado con Req 3); el flujo de estados no permite `pagado` sin `estadoPago='pagado'`.
- **Verificación:** Review cruzada con plan Req 3; `npm test` verde.
- **Archivos:** `docs/spec.md`, `src/api/pedidos.ts` (comentarios), `src/types/index.ts` (si Req 3 no cubrió el enum).
- **Dependencias:** Req 3. Tasks 6.1–6.4.
- **Scope:** docs + consistencia.

## Riesgos y mitigaciones

- **R1: Conflicto con Req 3 sobre `EstadoPedido`.** Ambos requisitos tocan el enum de estado y la noción de `pagado`. *Mitigación:* coordinar el orden de merge; Req 3 expande el enum, Req 6 añade `metodoPago`/`estadoPago` y la regla de derivación. Documentar la regla en un único lugar (`docs/spec.md`).
- **R2: Datos legacy sin los campos.** *Mitigación:* defaults de lectura en `api/pedidos.ts` (D5). Sin migración obligatoria.
- **R3: Inconsistencia `estado` vs `estadoPago`.** *Mitigación:* toda mutación de pago (`confirmarPago`, `changeEstado` a `pagado`) setea ambos campos en la misma escritura. Considerar una función helper `setPago(doc, pagado)` para centralizar.
- **R4: Lista de métodos incompleta o cambiante.** *Mitigación:* modelar como enum extensible; si el negocio requiere libertad, cambiar a `string` con sugeridos. Decisión diferida (Open questions).
- **R5: "Pagar ahora" con efectivo vs. creación de pedidos programados.** Un pedido puede crearse para una fecha futura pero pagarse hoy. *Mitigación:* `estadoPago` es independiente de la fecha; `pagarAhora` es válido para efectivo sin importar la fecha. Documentar.

## Dependencias con otros requisitos

- **Req 3 (estado `pagado`):** **dependencia estrecha y bidireccional.** Req 3 expande `EstadoPedido` a `creado | pagado | programado | entregando | entregado | cancelado`. Req 6 introduce `estadoPago` cuya transición a `pagado` proyecta `estado='pagado'`. Regla de oro: `estadoPago='pagado'` ⇔ `estado='pagado'`. Req 6 no debe redefinir el flujo de estados, solo acoplarse al nodo `pagado`. **Recomendación:** mergear Req 3 antes que Req 6, o en conjunto coordinado.
- **Req 4/5 (si existen, ej. programación/entrega):** el estado `programado`/`entregando` del Req 3 convive con `estadoPago`; un pedido puede estar `programado` y `pagado`, o `entregando` y `pendiente` (tarjeta no cobrada). Sin conflicto directo.

## Open questions

1. **Lista final de métodos de pago.** ¿`efectivo | tarjeta | transferencia` es suficiente? ¿Se necesita `webpay`, `debito`, `cheque`, `cuenta corriente`? ¿O métodos como texto libre? *Propuesta:* enum cerrado extensible; confirmar con el negocio.
2. **¿`pagado` es estado del flujo (Req 3) o campo separado?** *Decisión propuesta en este plan:* ambos — `estadoPago` es la fuente de verdad del pago; `estado='pagado'` es su proyección en el flujo de estados. Confirmar que Req 3 acepta esta derivación.
3. **Retroceso de pago.** Si se marca `estadoPago='pendiente'` después de haber estado `pagado` (reembolso/anulación), ¿a qué `estado` retrocede el pedido? ¿`creado`? ¿Se permite cancelar el pago? *Propuesta:* retroceder a `creado` y registrar como excepción; confirmar.
4. **¿`metodoPago` es editable después de crear?** ¿O solo `estadoPago` cambia? *Propuesta:* `metodoPago` editable en `PedidoForm`; `estadoPago` cambia vía `confirmarPago`/acción dedicada, no en el form de edición general.
5. **¿Múltiples métodos de pago por pedido?** (ej. mitad efectivo, mitad tarjeta). *Asumo no en MVP* — un solo `metodoPago` por pedido. Confirmar.
6. **¿Fecha/hora de pago?** ¿Se necesita `fechaPago` para auditoría? *Asumo no en MVP*; `estadoPago` + `estado='pagado'` basta. Confirmar.
7. **¿Monto pagado vs total?** ¿Pagos parciales? *Asumo no en MVP* — binario pagado/pendiente. Confirmar.
