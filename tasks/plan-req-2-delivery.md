# Plan Req 2: Delivery Padre Hurtado

## Resumen

Extender el modelo de `Pedido` para soportar delivery en Padre Hurtado ($1.300) o retiro en local ($0). El delivery se cobra **por pedido** (cada pedido con delivery suma $1.300 a su total). Cuando se crea un pedido con delivery y ya existe otro pedido con la **misma dirección**, el sistema lo **indica** (aviso informativo, no bloquea ni cambia el costo). El delivery es un toggle: **aplica / no aplica**. El `total` del pedido pasa a ser `Σ(precio×cantidad) + deliveryCost`.

## Decisiones de arquitectura

### 1. Modelado del tipo de entrega (toggle aplica/no aplica)
- Nuevo campo `tipoEntrega: 'delivery' | 'retiro'` en `Pedido` y `PedidoInput`.
  - `delivery` → entrega en Padre Hurtado, `deliveryCost = 1300`.
  - `retiro` → retiro en local, `deliveryCost = 0`.
- El usuario marca o no el delivery al crear/editar el pedido. No hay cálculo automático de "único por cliente".

### 2. Modelado del costo de delivery
- Nuevo campo `deliveryCost: number` en `Pedido` y `PedidoInput`.
- `retiro` → `deliveryCost = 0` siempre.
- `delivery` → `deliveryCost = 1300` (constante `DELIVERY_COST`).
- Constantes `DELIVERY_COST = 1300` y `DELIVERY_ZONA = 'Padre Hurtado'` centralizadas en `src/constants/delivery.ts`.

### 3. Aviso de dirección duplicada (informativo, no bloqueante)
**Cuando se crea/edita un pedido con `tipoEntrega = 'delivery'`:**
1. La API (o el hook) consulta Firestore: `query(collection('pedidos'), where('clienteDireccion', '==', direccion), where('fecha', '==', fecha))`.
2. Si retorna **al menos un documento** (excluyendo el que se edita) → se devuelve un flag `direccionDuplicada: true` o una lista de pedidos con esa dirección.
3. La UI muestra un aviso: "Ya existe otro pedido con la misma dirección hoy" (informativo, **no bloquea** el guardado, **no cambia** el `deliveryCost`).
4. El `deliveryCost` se mantiene en $1.300 por pedido independientemente del aviso.

**Dónde se hace la consulta:**
- En el hook `usePedidos` (función `verificarDireccionDuplicada(direccion, fecha, excludeId?)`) para que la UI pueda mostrar el aviso **antes** de guardar (preview) y/o **después** de guardar (confirmación).
- Alternativa: consulta on-demand al seleccionar la dirección en el form. Se decide en implementación según UX.

### 4. Dónde se calcula el deliveryCost
- **En el formulario**: el usuario marca `tipoEntrega` (radio/select). El `total` preview = `Σ(precio×cantidad) + (tipoEntrega === 'delivery' ? 1300 : 0)`.
- **En la capa API**: `createPedido` y `updatePedido` setean `deliveryCost` según `tipoEntrega` (source of truth). El `total` se recalcula en la API: `total = Σ(precio×cantidad) + deliveryCost`.
- El `deliveryCost` que envía el form es un preview; la API lo sobrescribe según `tipoEntrega` para evitar inconsistencias.

### 5. `total` sigue siendo un campo persistido
- `total = Σ(precio×cantidad) + deliveryCost`. Se persiste en el documento para reportes y consistencia.

## Cambios al modelo de datos

### `src/types/index.ts`

```ts
export type TipoEntrega = 'delivery' | 'retiro';

export const DELIVERY_COST = 1300;
export const DELIVERY_ZONA = 'Padre Hurtado';

export interface Pedido {
  id: string;
  fecha: string;
  clienteId: string;          // Req 1 — referencia a colección clientes
  clienteDireccion: string;   // Req 1 — snapshot (usado para aviso de duplicado)
  registradoPor: string;
  colacionId?: string | null;
  items: PedidoItem[];
  total: number;              // Σ(precio×cantidad) + deliveryCost
  deliveryCost: number;       // NUEVO — 0 | 1300
  tipoEntrega: TipoEntrega;   // NUEVO — 'delivery' | 'retiro'
  estado: EstadoPedido;
}

export type PedidoInput = Omit<Pedido, 'id' | 'estado'> & {
  estado?: EstadoPedido;
};
```

### `src/api/schemas.ts`

```ts
export const TipoEntregaSchema = z.enum(['delivery', 'retiro']);

export const PedidoSchema = z.object({
  // ... campos existentes ...
  clienteId: z.string().min(1, 'clienteId es requerido'),
  clienteDireccion: z.string().min(1, 'clienteDireccion es requerido'),
  deliveryCost: z.number().min(0, 'deliveryCost debe ser >= 0'),
  tipoEntrega: TipoEntregaSchema,
});

export const PedidoInputSchema = PedidoSchema.omit({ id: true, estado: true }).extend({
  estado: EstadoPedidoSchema.optional(),
});
```

### Colección Firestore `pedidos`
- Nuevos campos por documento: `tipoEntrega`, `deliveryCost`, `clienteId`, `clienteDireccion`.
- Backfill legacy: `tipoEntrega = 'retiro'`, `deliveryCost = 0` (tarea opcional, MVP sin datos en producción).

## Tareas (vertical slices, <5 archivos c/u)

### Task 2.1: Modelo de datos + constantes + esquemas Zod
Extender tipos, constantes y validación runtime.

- **Aceptación:**
  - `TipoEntrega` exportado como `'delivery' | 'retiro'`.
  - `DELIVERY_COST = 1300` y `DELIVERY_ZONA = 'Padre Hurtado'` exportados.
  - `Pedido` y `PedidoInput` incluyen `tipoEntrega`, `deliveryCost`, `clienteId`, `clienteDireccion`.
  - `PedidoSchema` y `PedidoInputSchema` validan los nuevos campos.
  - `tsc -b` compila sin errores.
- **Verificación:** `npm run build` pasa. Test del schema: input válido con `tipoEntrega: 'delivery'`, `deliveryCost: 1300` pasa; input con `tipoEntrega: 'foo'` lanza.
- **Archivos (≤4):** `src/types/index.ts`, `src/api/schemas.ts`, `src/constants/delivery.ts`, `tests/api/schemas.test.ts`.
- **Dependencias:** Ninguna bloqueante.
- **Scope:** Solo modelo + validación.

---

### Task 2.2: Lógica de delivery en la API + aviso de dirección duplicada
Implementar el seteo de `deliveryCost` según `tipoEntrega` y la consulta de dirección duplicada.

- **Aceptación:**
  - `createPedido`: si `tipoEntrega === 'retiro'` → `deliveryCost = 0`. Si `tipoEntrega === 'delivery'` → `deliveryCost = 1300`. Recalcula `total = Σ(precio×cantidad) + deliveryCost`.
  - `updatePedido`: misma lógica, recalcula `deliveryCost` y `total`.
  - Nueva función `verificarDireccionDuplicada(direccion, fecha, excludeId?): Promise<Pedido[]>` que consulta `pedidos` con `where('clienteDireccion', '==', direccion)` + `where('fecha', '==', fecha)`, excluye `excludeId`, retorna los pedidos que coinciden (array vacío si no hay).
  - `tsc -b` compila.
- **Verificación:**
  - `npm test` — tests de API cubren:
    1. Crear pedido `delivery` → `deliveryCost = 1300`, `total` incluye 1300.
    2. Crear pedido `retiro` → `deliveryCost = 0`, `total` sin 1300.
    3. `verificarDireccionDuplicada` con dirección que ya tiene pedido ese día → retorna array no vacío.
    4. `verificarDireccionDuplicada` con dirección sin pedidos → retorna array vacío.
    5. `verificarDireccionDuplicada` excluye el `excludeId` correctamente.
- **Archivos (≤4):** `src/api/pedidos.ts`, `tests/api/pedidos.test.ts`, `tests/helpers/mockFirestore.ts` (solo si se necesita extender), `src/constants/delivery.ts`.
- **Dependencias:** Task 2.1.
- **Scope:** Solo API + tests.

---

### Task 2.3: Hook `usePedidos` + propagación de nuevos campos + función de aviso
Asegurar que el hook propaga `tipoEntrega`, `deliveryCost`, `clienteId`, `clienteDireccion` y expone `verificarDireccionDuplicada`.

- **Aceptación:**
  - `changeEstado` reconstruye `PedidoInput` incluyendo `tipoEntrega`, `deliveryCost`, `clienteId`, `clienteDireccion`.
  - Hook expone `verificarDireccion(direccion, fecha, excludeId?)` que delega a `verificarDireccionDuplicada` de la API.
  - `tsc -b` compila.
- **Verificación:** `npm test` — `tests/hooks/usePedidos.test.tsx` extendido: `changeEstado` mantiene los nuevos campos; `verificarDireccion` retorna resultados.
- **Archivos (≤3):** `src/hooks/usePedidos.ts`, `tests/hooks/usePedidos.test.tsx`.
- **Dependencias:** Task 2.1, Task 2.2.
- **Scope:** Solo hook + tests.

---

### Task 2.4: UI — `PedidoForm` (toggle delivery + preview total + aviso dirección duplicada)
Añadir control de tipo de entrega y aviso informativo de dirección duplicada.

- **Aceptación:**
  - Nuevo estado `tipoEntrega` en `PedidoForm`, default `'retiro'`.
  - Radio/select con dos opciones: "Delivery (Padre Hurtado) — $1.300" / "Retiro en local — $0".
  - `total` mostrado = `Σ(precio×cantidad) + (tipoEntrega === 'delivery' ? 1300 : 0)`.
  - Al seleccionar `delivery` y elegir/seleccionar un cliente con dirección, se llama a `verificarDireccion`. Si hay coincidencias, se muestra aviso: "⚠ Ya existe otro pedido con la misma dirección hoy" (informativo, no bloquea el guardado).
  - `onSubmit` envía `tipoEntrega` y `deliveryCost` (preview). La API recalcula.
  - Modo edición: `inicial.tipoEntrega` se precarga.
  - `tsc -b` compila.
- **Verificación:** `npm test` — `tests/components/PedidoForm.test.tsx` extendido:
  1. Render muestra opciones de tipo de entrega.
  2. Seleccionar delivery + submit → `onSubmit` recibe `tipoEntrega: 'delivery'`, `deliveryCost: 1300`.
  3. Seleccionar retiro + submit → `tipoEntrega: 'retiro'`, `deliveryCost: 0`.
  4. Total mostrado incluye 1300 cuando es delivery.
  5. Aviso de dirección duplicada se muestra cuando `verificarDireccion` retorna resultados.
  6. Modo edición precarga `tipoEntrega`.
- **Archivos (≤4):** `src/components/PedidoForm.tsx`, `src/components/PedidoForm.module.css`, `tests/components/PedidoForm.test.tsx`.
- **Dependencias:** Task 2.1, Task 2.3. Req 1 para `clienteId` + `clienteDireccion` reales.
- **Scope:** Solo formulario + tests.

---

### Task 2.5: UI — `PedidoList` (mostrar tipo de entrega + delivery cost)
Mostrar en la tabla el tipo de entrega y el costo de delivery.

- **Aceptación:**
  - Nueva columna "Entrega" que muestra "Delivery PH" o "Retiro".
  - Columna "Total" muestra el total (incluye delivery). Opcional: desglose `(items: $X + delivery: $1.300)`.
  - `tsc -b` compila.
- **Verificación:** `npm test` — test de render de `PedidoList` con los nuevos campos. Verificación manual de layout.
- **Archivos (≤3):** `src/components/PedidoList.tsx`, `src/components/PedidoList.module.css`, `tests/components/PedidoList.test.tsx`.
- **Dependencias:** Task 2.1.
- **Scope:** Solo lista + tests. Paralelizable con Task 2.4.

---

### Task 2.6: Documentación + verificación final
- **Aceptación:**
  - `docs/spec.md` actualizado con `tipoEntrega`, `deliveryCost`, y la regla de aviso de dirección duplicada.
  - `npm test` y `npm run build` pasan.
  - Verificación manual: crear pedido delivery → aviso si hay otro con misma dirección → total incluye $1.300.
- **Verificación:** `npm test && npm run build` verdes.
- **Archivos (≤2):** `docs/spec.md`, `tasks/plan-req-2-delivery.md`.
- **Dependencias:** Tasks 2.1–2.5.
- **Scope:** Docs + verificación.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Aviso de dirección duplicada no aparece por timing (consulta async) | Bajo | Mostrar aviso al seleccionar dirección; si no llegó antes de guardar, mostrar confirmación post-guardado |
| `clienteDireccion` no existe (Req 1 no implementado) | Medio | Fallback: usar campo texto `cliente` normalizado. Migrar a `clienteDireccion` real con Req 1 |
| Pedidos legacy sin `tipoEntrega`/`deliveryCost` | Bajo | MVP sin datos en producción. Backfill opcional: `tipoEntrega='retiro'`, `deliveryCost=0` |
| `total` del form vs `total` de la API | Bajo | La API es source of truth: recalcula `total` |

## Dependencias con otros requisitos

- **Req 1 (clientes con `clienteId` + `clienteDireccion`)**: Dependencia para el aviso de dirección duplicada (usa `clienteDireccion`). Sin Req 1, se usa fallback con campo `cliente` normalizado. El `deliveryCost` por pedido funciona sin Req 1.
- **Req 3+**: Sin dependencias.

## Open questions

1. **¿El aviso de dirección duplicada se muestra antes de guardar (preview) o después (confirmación)?**
   - Recomendación: antes (al seleccionar dirección), para que el usuario sepa. Si no llegó a tiempo, también después.
2. **¿Qué información muestra el aviso?** ¿Solo "ya existe otro pedido" o lista los pedidos (cliente, hora, estado)?
   - Recomendación: mostrar cantidad + nombres de clientes con esa dirección.
3. **¿El costo de delivery ($1.300) debe ser configurable o es fijo?**
   - Asumido fijo en MVP. Si configurable, añadir a colección `config` o `settings`.
4. **¿Se necesita índice Firestore en `(clienteDireccion, fecha)`?**
   - Query usa 2 campos `==` (single-field indexes automáticos). No se necesita índice compuesto manual.
