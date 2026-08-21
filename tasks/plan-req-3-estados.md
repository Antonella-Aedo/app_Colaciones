# Plan Req 3: Estados de Pedido

## Resumen

Expandir el `EstadoPedido` del conjunto actual (`pendiente | entregado | cancelado`) a un conjunto claro y definido que represente el ciclo de vida real de un pedido de colaciones: `creado | pagado | programado | entregando | entregado | cancelado`. Esto incluye actualizar el tipo TypeScript, el esquema Zod, el default de `createPedido`, la migración de datos existentes (`pendiente` → `creado`), la UI (`PedidoList` con labels legibles y estilos por estado), y documentar el flujo de transiciones válidas y su interacción con el Req 6 (métodos de pago). No se implementa código en esta fase: este documento define las decisiones y las tareas verticales para ejecutar el requisito.

## Decisiones de arquitectura

- **Lista de estados final (enum canónico, en inglés para persistencia):**
  - `creado` — pedido registrado, pendiente de pago.
  - `pagado` — pago confirmado (relacionado con Req 6: método de pago).
  - `programado` — agendado para una fecha/hora de entrega.
  - `entregando` — en proceso de entrega/despacho.
  - `entregado` — entregado al cliente (estado terminal exitoso).
  - `cancelado` — anulado (estado terminal fallido).

- **Transiciones:** se definen como **restringidas** (no libres) para evitar saltos inválidos (ej: `entregado` → `creado`). La restricción se valida en la capa API (`updatePedido` / un helper `transicionValida`), no solo en la UI. Rationale: el estado es parte del contrato de dominio; validar en API protege contra escrituras directas a Firestore y contra bugs de UI. Si el producto decide después que son libres, basta con relajar el helper sin tocar el enum.

- **Tabla de transiciones válidas:**

  | Estado actual   | Estados destino permitidos            |
  | --------------- | ------------------------------------- |
  | `creado`        | `pagado`, `cancelado`                 |
  | `pagado`        | `programado`, `cancelado`             |
  | `programado`    | `entregando`, `cancelado`             |
  | `entregando`    | `entregado`, `cancelado`, `programado`|
  | `entregado`     | _(terminal — sin transiciones)_       |
  | `cancelado`     | _(terminal — sin transiciones)_       |

  Notas:
  - `cancelado` es alcanzable desde cualquier estado no terminal (excepto `entregado`).
  - `entregando` → `programado` permite re-agendar si el intento de entrega falla (rebote controlado).
  - No se permite `creado` → `entregado` directo (debe pasar por el flujo).

- **Mapeo de migración de datos existentes:**

  | Estado legacy | Estado nuevo |
  | ------------- | ------------ |
  | `pendiente`   | `creado`     |
  | `entregado`   | `entregado`  |
  | `cancelado`   | `cancelado`  |

  - `pendiente` es el único estado que cambia semánticamente; se mapea a `creado` porque ambos representan "recién registrado, sin avance".
  - La migración se ejecuta una sola vez vía un script/función que recorra la colección `pedidos` y reescriba `estado` según la tabla. Se documenta en `docs/spec.md` y se deja como tarea explícita (no se asume que el entorno tenga datos productivos; en dev/test el mock store se resetea).

- **Default de creación:** `createPedido` deja de defaultear `'pendiente'` y pasa a defaultear `'creado'`. El campo `estado` sigue siendo opcional en `PedidoInput` (el default lo provee la API).

- **Labels legibles (UI):** los valores persistidos son los tokens en inglés/español del enum (`creado`, etc., ya son legibles en español). Se mantiene el token como `value` del `<option>` y se muestra capitalizado vía CSS `text-transform: capitalize` (ya existe). Si se requieren labels distintos del token (ej: `entregando` → "En entrega"), se introduce un mapa `ESTADO_LABELS` en `PedidoList.tsx`.

- **Interacción con Req 6 (pagos):** el estado `pagado` es el puente. Cuando el Req 6 implemente métodos de pago, la transición `creado → pagado` deberá registrar el método de pago usado (campo futuro `metodoPago` en `Pedido`). En este requisito solo se **reserva el estado `pagado`** y se documenta la dependencia; no se modela el campo de pago aquí. La transición `creado → pagado` es válida desde ya (aunque el disparador automático venga con el Req 6).

## Cambios al modelo de datos

- **`src/types/index.ts`** — `EstadoPedido`:
  - De: `'pendiente' | 'entregado' | 'cancelado'`
  - A: `'creado' | 'pagado' | 'programado' | 'entregando' | 'entregado' | 'cancelado'`
  - `Pedido.estado` y `PedidoInput.estado?` usan el nuevo tipo sin más cambios estructurales.

- **`src/api/schemas.ts`** — `EstadoPedidoSchema`:
  - De: `z.enum(['pendiente', 'entregado', 'cancelado'])`
  - A: `z.enum(['creado', 'pagado', 'programado', 'entregando', 'entregado', 'cancelado'])`
  - Opcional: añadir un `ESTADOS_PEDIDO` array exportado como fuente única de verdad (usado por UI y tests) para evitar duplicar la lista.

- **`src/api/pedidos.ts`** — `createPedido`:
  - Default `estado: 'pendiente'` → `estado: 'creado'` (dos sitios: el `addDoc` y el `return`).
  - `updatePedido`: el fallback cuando `estado === undefined` cambia de `'pendiente'` a `'creado'` (aunque en la práctica siempre habrá un estado previo; es defensa).

- **Migración de datos existentes:** función/script `migrarEstadosPedidos()` que recorra `pedidos` y reescriba `pendiente` → `creado`. Se documenta el mapeo arriba. En entornos con mock store (tests) no es necesaria porque `resetStore` limpia; en Firestore real se ejecuta una vez.

- **Transiciones (nuevo helper):** añadir `src/api/pedidos.ts` (o un `src/api/estadoTransiciones.ts` pequeño) un mapa `TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]>` y una función `puedeTransicionar(de: EstadoPedido, a: EstadoPedido): boolean`. `updatePedido` lo consulta cuando `input.estado` está definido y difiere del actual; si la transición es inválida, lanza un error tipado (ej: `EstadoTransicionInvalidaError`). Esto centraliza la regla de negocio fuera de la UI.

## Tareas (vertical slices, <5 archivos c/u)

### Task 3.1: Modelo de estados y validación de transiciones (capa API/types)

**Descripción:** Expandir el enum `EstadoPedido` en tipos y schema, añadir el helper de transiciones válidas, y cambiar el default de `createPedido` a `creado`. Deja el contrato de dominio listo para que UI y migración se apoyen en él.

**Aceptación / Verificación:**
- [ ] `EstadoPedido` en `src/types/index.ts` contiene los 6 estados nuevos y no incluye `pendiente`.
- [ ] `EstadoPedidoSchema` en `src/api/schemas.ts` refleja exactamente el mismo enum.
- [ ] Existe `TRANSICIONES_VALIDAS` y `puedeTransicionar(de, a)` que implementa la tabla de transiciones.
- [ ] `createPedido` defaultea `estado` a `creado` (no `pendiente`).
- [ ] `updatePedido` rechaza transiciones inválidas lanzando un error (no persiste estados saltados).
- [ ] Tests: `npm test` pasa; los tests existentes de `pedidos.test.ts` que asumen `'pendiente'` se actualizan a `'creado'`; se añaden tests de transiciones válidas e inválidas.
- [ ] Build: `npm run build` sin errores de TS estricto.

**Archivos:**
- `src/types/index.ts`
- `src/api/schemas.ts`
- `src/api/pedidos.ts`
- `tests/api/pedidos.test.ts`

**Dependencias:** Ninguna (es la base).

**Scope:** Medium (3-4 archivos).

---

### Task 3.2: Hook `usePedidos` + tests del hook

**Descripción:** Ajustar `usePedidos` para que `changeEstado` respete las transiciones válidas (delegando en la API, que ya valida) y propagar errores de transición inválida al estado `error` del hook. Actualizar tests del hook.

**Aceptación / Verificación:**
- [ ] `changeEstado(id, estado)` sigue reconstruyendo el `PedidoInput` pero la validación de transición ocurre en `updatePedido` (la API).
- [ ] Si `updatePedido` lanza error de transición inválida, el hook lo captura y lo expone en `error` (no rompe la lista en cache).
- [ ] Tests: `tests/hooks/usePedidos.test.tsx` actualiza la aserción `estado === 'pendiente'` a `estado === 'creado'`; añade un caso de transición válida (`creado` → `pagado`) y uno inválido (`creado` → `entregado` rechazado).
- [ ] `npm test` pasa.

**Archivos:**
- `src/hooks/usePedidos.ts`
- `tests/hooks/usePedidos.test.tsx`

**Dependencias:** Task 3.1.

**Scope:** Small (2 archivos).

---

### Task 3.3: UI `PedidoList` — select con nuevos estados, labels y estilos

**Descripción:** Actualizar `PedidoList.tsx` para que el `<select>` muestre los 6 estados nuevos con labels legibles en español, y `PedidoList.module.css` para cubrir los nuevos `data-estado` con colores diferenciados. El badge de estado (`.estado[data-estado=...]`) debe tener color por estado.

**Aceptación / Verificación:**
- [ ] `ESTADOS` en `PedidoList.tsx` usa los 6 estados nuevos (fuente única: importar de `schemas`/`types` si se creó el array canónico, o definirlo localmente alineado al enum).
- [ ] Existe `ESTADO_LABELS: Record<EstadoPedido, string>` con labels legibles (ej: `entregando` → "En entrega", `creado` → "Creado", etc.). El `<option>` muestra el label; el `value` sigue siendo el token.
- [ ] El badge `<span data-estado={p.estado}>` muestra el label capitalizado.
- [ ] `PedidoList.module.css` tiene reglas `.estado[data-estado='creado'|'pagado'|'programado'|'entregando'|'entregado'|'cancelado']` con paleta coherente (ej: creado=ámbar, pagado=azul, programado=violeta, entregando=naranjo, entregado=verde, cancelado=rojo). Se elimina la regla `pendiente`.
- [ ] `onChange` sigue llamando `onChangeEstado(p.id, e.target.value as EstadoPedido)`.
- [ ] Build y `npm test` pasan (si hay test de componente de `PedidoList`, se actualiza; si no existe, no se crea aquí — fuera de scope de UI salvo que exista).

**Archivos:**
- `src/components/PedidoList.tsx`
- `src/components/PedidoList.module.css`

**Dependencias:** Task 3.1 (enum nuevo).

**Scope:** Small (2 archivos).

---

### Task 3.4: Migración de datos existentes (`pendiente` → `creado`)

**Descripción:** Implementar y documentar la migración one-shot de la colección `pedidos` en Firestore para reescribir el estado legacy `pendiente` a `creado`. Los estados `entregado` y `cancelado` no cambian. En entornos de test (mock store) no se ejecuta porque `resetStore` limpia, pero la función debe existir y estar testeada unitariamente.

**Aceptación / Verificación:**
- [ ] Existe `migrarEstadosPedidos()` en `src/api/pedidos.ts` (o `src/api/migraciones.ts`) que recorre `pedidos`, y para cada doc con `estado === 'pendiente'` hace `setDoc`/`updateDoc` con `estado: 'creado'`.
- [ ] La función es idempotente (re-ejecutar no cambia docs ya migrados).
- [ ] Test unitario: crea docs con `pendiente`, ejecuta la migración, verifica que quedan en `creado` y que `entregado`/`cancelado` se preservan.
- [ ] El mapeo está documentado en `docs/spec.md` (sección Pedidos, campo `estado`).
- [ ] `npm test` pasa.

**Archivos:**
- `src/api/pedidos.ts` (o nuevo `src/api/migraciones.ts`)
- `tests/api/pedidos.test.ts` (o `tests/api/migraciones.test.ts`)
- `docs/spec.md`

**Dependencias:** Task 3.1.

**Scope:** Small-Medium (2-3 archivos).

---

### Task 3.5: Documentación del flujo de estados y dependencia con Req 6

**Descripción:** Actualizar `docs/spec.md` para documentar el nuevo ciclo de vida del pedido: enum de estados, tabla de transiciones, mapeo de migración, y la interacción con el Req 6 (estado `pagado` y futuro campo `metodoPago`). Sirve como contrato para los requisitos 6 y futuros.

**Aceptación / Verificación:**
- [ ] `docs/spec.md` sección Pedidos refleja el enum nuevo (reemplaza `'pendiente' | 'entregado' | 'cancelado'`).
- [ ] Incluye la tabla de transiciones válidas (igual a la de este plan).
- [ ] Incluye el mapeo de migración `pendiente → creado`.
- [ ] Documenta que `pagado` es el puente con Req 6 y que el campo `metodoPago` se modela en el Req 6, no aquí.
- [ ] Open Question #2 de spec.md ("¿Estados de pedido?") se marca como resuelta con referencia a este flujo.

**Archivos:**
- `docs/spec.md`

**Dependencias:** Task 3.1 (para alinear el enum documentado con el código).

**Scope:** XS (1 archivo).

---

### Checkpoint: Tras Tasks 3.1–3.5
- [ ] `npm test` pasa (tests de API, hook actualizados).
- [ ] `npm run build` sin errores.
- [ ] Flujo end-to-end: crear pedido → aparece en `creado`; cambiar a `pagado` → válido; intentar saltar a `entregado` desde `creado` → rechazado.
- [ ] UI muestra los 6 estados con colores y labels legibles.
- [ ] `docs/spec.md` coherente con el código.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| Datos legacy en Firestore con `pendiente` rompen la lectura si el enum ya no lo incluye | Alto | Ejecutar migración (Task 3.4) **antes** de desplegar el código que elimina `pendiente`; o bien mantener `pendiente` en el enum como alias deprecado temporalmente. Decisión: migrar primero. |
| Transiciones restringidas bloquean un caso de uso real no previsto | Medio | El rebote `entregando → programado` cubre el caso más común (entrega fallida). Si surge otro, añadirlo al mapa `TRANSICIONES_VALIDAS` (cambio puntual). |
| Tests existentes hardcodean `'pendiente'` | Medio | Task 3.1 y 3.2 actualizan las aserciones a `'creado'`. Se listan explícitamente los archivos de test afectados. |
| `ESTADOS` duplicado entre `schemas.ts`, `PedidoList.tsx` y tests | Bajo | Introducir un array canónico `ESTADOS_PEDIDO` (export desde `schemas.ts` o `types`) y que UI/tests lo importen. Evita drift. |
| Req 6 cambia la semántica de `pagado` | Bajo-Medio | Este plan solo reserva el estado y documenta la dependencia; el modelado del pago se hace en Req 6. Si Req 6 decide que `pagado` se setea automáticamente al registrar pago, la transición `creado → pagado` ya está permitida. |

## Dependencias con otros requisitos

- **Req 6 (métodos de pago):** el estado `pagado` es el punto de integración. Al implementar el Req 6, el registro de un pago deberá disparar la transición `creado → pagado` y, eventualmente, persistir un campo `metodoPago` en `Pedido`. Este plan **no** modela `metodoPago` (queda para Req 6), pero deja la transición válida y la documentación del puente. Recomendación: coordinar el contrato del campo `metodoPago` antes de implementar Req 6 para que ambos requisitos converjan en el mismo `Pedido`.
- **Req de programación/agenda (si existe):** el estado `programado` asume que el pedido tiene una fecha/hora de entrega. Si no hay requisito de agenda, `programado` puede omitirse del flujo o usarse opcionalmente. Open question.

## Open questions

- **¿Transiciones restringidas o libres?** Propuesta: restringidas (validadas en API). Confirmar con producto si se requiere libertad total (cualquier estado → cualquier estado). Si se elige libre, la Task 3.1 se simplifica (se elimina el helper de transiciones) pero se pierde protección de dominio.
- **¿Se incluye `programado`?** Depende de si existe un flujo de agendamiento. Si las colaciones se entregan el mismo día, `programado` podría no aplicar y el flujo sería `creado → pagado → entregando → entregado`. Confirmar.
- **¿Labels de UI iguales al token o distintos?** Ej: `entregando` vs "En entrega". Propuesta: usar un `ESTADO_LABELS` para desacoplar token persistido de texto mostrado. Confirmar si se quiere exactamente el token capitalizado.
- **¿Migración automática al desplegar o manual?** ¿Se ejecuta `migrarEstadosPedidos()` una vez manualmente vía consola/script, o se engancha al arranque de la app? Propuesta: manual/one-shot, no al arranque (evitar coste en cada boot).
- **¿`cancelado` reversible?** Propuesta: terminal (no reversible). Si se permite reabrir, añadir `cancelado → creado` a la tabla. Confirmar con producto.
