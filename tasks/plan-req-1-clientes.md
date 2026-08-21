# Plan Req 1: Colección de Clientes

## Resumen

Se añade una nueva colección Firestore `clientes` con CRUD completo (dirección obligatoria, contacto obligatorio, nombre opcional) y se integra con el flujo de pedidos reemplazando el campo `Pedido.cliente: string` por una referencia `clienteId` más un snapshot de los datos del cliente (dirección, contacto, nombre) para mantener resiliencia de visualización, siguiendo la convención de snapshots ya usada en `PedidoItem`. Se incorpora una pantalla de Clientes (formulario + lista + página + ruta) y un selector de cliente en `PedidoForm`. Esta referencia estable por `clienteId` es prerequisite del Req 2 (delivery agrupado por mismo cliente).

## Decisiones de arquitectura

- **Identidad del cliente = dirección + contacto.** El nombre es opcional y se ingresa al crear/editar el cliente (no es clave). No se usa el nombre como identificador porque el requisito lo declara explícitamente opcional. Se recomienda un helper `findOrCreateCliente(direccion, contacto, nombre?)` que busque por `(direccion, contacto)` y reuse el doc existente o lo cree, para evitar duplicados que romperían la agrupación del Req 2.
- **`Pedido` referencia por `clienteId` + snapshot.** Se sigue la convención de snapshots del codebase (nombre/precio en `PedidoItem`): el pedido guarda `clienteId` (referencia) y `clienteDireccion`, `clienteContacto`, `clienteNombre?` (snapshot al momento del pedido). Esto permite que `PedidoList` muestre datos sin un join y sea resiliente a ediciones/eliminación del cliente. El campo `cliente: string` se elimina del tipo y schema.
- **No se elimina `cliente: string` sin migración.** Los pedidos existentes en Firestore tienen `cliente: string`. Se provee un script de migración (Task 1.8) que crea un doc `clientes` por cada valor histórico único y backfill-ea `clienteId` + snapshots. Hasta ejecutar la migración, los pedidos viejos se tratan como legacy (ver Riesgos).
- **Capa API espeja `productos.ts`.** Mismas funciones CRUD en minúsculas (`getClientes`, `getCliente`, `createCliente`, `updateCliente`, `deleteCliente`, `findOrCreateCliente`), validación con Zod antes de persistir, sin `any`.
- **Hook `useClientes` espeja `useProductos`.** Estado `clientes/loading/error` + `refetch/create/update/remove`, fetch-on-mount con `useEffect`.
- **UI sigue CSS Modules y convención de páginas.** `ClientesPage` orquesta `ClienteForm` + `ClienteList` igual que `ProductosPage` orquesta `ProductoForm` + `ProductoList`. Se añade ruta `/clientes` y nav link en `Layout`.
- **Selector de cliente en `PedidoForm`.** Reemplaza el input libre de texto por un `<select>` de clientes existentes + opción "Nuevo cliente…" que abre `ClienteForm` inline (o redirige a `/clientes`). Al seleccionar, se setea `clienteId` y se snapshot-ean dirección/contacto/nombre en el `PedidoInput`.
- **`nombre` se ingresa "cada vez que se añade la dirección".** Interpretación: al crear un cliente se captura dirección + contacto (obligatorios) y nombre (opcional). El nombre puede quedar vacío y editarse después. No se persiste un historial de nombres por dirección; el cliente tiene un solo `nombre?` actual.

## Cambios al modelo de datos

- **Nueva colección `clientes`** con campos:
  - `direccion: string` (obligatorio)
  - `contacto: string` (obligatorio, número de contacto)
  - `nombre?: string | null` (opcional)
  - (Opcional/recomendado) `creadoPor: string` y `actualizadoEn?: string` para trazabilidad mínima, alineado con `creadoPor` en colaciones. **Open question** si se incluye.
- **Tipos nuevos** en `src/types/index.ts`:
  - `Cliente { id; direccion; contacto; nombre?: string | null }`
  - `ClienteInput = Omit<Cliente, 'id'>`
- **Cambios a `Pedido`** en `src/types/index.ts`:
  - Eliminar `cliente: string`.
  - Añadir `clienteId: string` (referencia a `clientes/{id}`).
  - Añadir snapshots: `clienteDireccion: string`, `clienteContacto: string`, `clienteNombre?: string | null`.
  - `PedidoInput` se ajusta en consecuencia (omite `id`/`estado`).
- **Schemas Zod** en `src/api/schemas.ts`:
  - `ClienteSchema`, `ClienteInputSchema` (direccion `min(1)`, contacto `min(1)`, nombre opcional).
  - `PedidoSchema` / `PedidoInputSchema`: reemplazar `cliente: z.string().min(1)` por `clienteId: z.string().min(1)`, `clienteDireccion: z.string().min(1)`, `clienteContacto: z.string().min(1)`, `clienteNombre: z.string().nullable().optional()`.

## Tareas (vertical slices, cada una <5 archivos)

### Task 1.1: Modelo de datos y schemas (tipos + Zod)
- Aceptación:
  - `Cliente` y `ClienteInput` definidos en `src/types/index.ts`.
  - `Pedido` usa `clienteId` + snapshots (`clienteDireccion`, `clienteContacto`, `clienteNombre?`); `cliente: string` eliminado.
  - `ClienteSchema`, `ClienteInputSchema` definidos en `src/api/schemas.ts`.
  - `PedidoSchema`/`PedidoInputSchema` actualizados con los nuevos campos.
  - `npm run build` (tsc estricto) pasa sin errores de tipos (puede haber errores en archivos que consumen `Pedido.cliente` hasta Tasks 1.6/1.7; en ese caso esta task se considera completa a nivel modelo y los errores se resuelven en 1.6/1.7 — documentar).
- Verificación: `npm run build` (esperar errores solo en consumidores de `Pedido.cliente`, a corregir en 1.6/1.7) y `npm run lint`.
- Archivos: `src/types/index.ts`, `src/api/schemas.ts`
- Dependencias: Ninguna
- Scope: S

### Task 1.2: API clientes (CRUD + findOrCreate) + tests
- Aceptación:
  - `src/api/clientes.ts` con `getClientes`, `getCliente`, `createCliente`, `updateCliente`, `deleteCliente`, `findOrCreateCliente(direccion, contacto, nombre?)`.
  - `findOrCreateCliente` busca por `(direccion, contacto)` (query `where`); si existe retorna el doc, si no lo crea con `ClienteInputSchema.parse`.
  - Todas las escrituras validan con Zod antes de persistir.
  - `tests/api/clientes.test.ts` cubre: create con id, list, get por id, get inexistente retorna null, update, delete, validación runtime (direccion vacía rechaza, contacto vacío rechaza, nombre opcional acepta undefined), findOrCreate crea en primera llamada y reutiliza en segunda.
  - Usa `tests/helpers/mockFirestore.ts` (ya soporta `where`/`query`).
- Verificación: `npm test -- clientes`
- Archivos: `src/api/clientes.ts`, `tests/api/clientes.test.ts`
- Dependencias: Task 1.1
- Scope: M

### Task 1.3: Hook `useClientes` + tests
- Aceptación:
  - `src/hooks/useClientes.ts` espeja `useProductos.ts`: estado `clientes/loading/error`, `refetch`, `create`, `update`, `remove`.
  - `tests/hooks/useClientes.test.tsx` cubre carga inicial, create añade a la lista, update reemplaza, remove filtra.
- Verificación: `npm test -- useClientes`
- Archivos: `src/hooks/useClientes.ts`, `tests/hooks/useClientes.test.tsx`
- Dependencias: Task 1.2
- Scope: S

### Task 1.4: Componentes `ClienteForm` + `ClienteList` + styles + test
- Aceptación:
  - `ClienteForm.tsx` con campos direccion (oblig), contacto (oblig), nombre (opcional); validación client-side (direccion y contacto no vacíos); props `inicial?: Cliente | null`, `onSubmit`, `onCancel` (espejo de `ProductoForm`).
  - `ClienteList.tsx` tabla con columnas Dirección, Contacto, Nombre, Acciones (Editar/Eliminar); props `clientes/loading/error/onEdit/onDelete` (espejo de `PedidoList`/`ProductoList`).
  - CSS Modules junto a cada componente.
  - `tests/components/ClienteForm.test.tsx` cubre render, error al enviar sin direccion, envío válido llama `onSubmit` con `ClienteInput`.
- Verificación: `npm test -- ClienteForm`
- Archivos: `src/components/ClienteForm.tsx`, `src/components/ClienteForm.module.css`, `src/components/ClienteList.tsx`, `src/components/ClienteList.module.css`, `tests/components/ClienteForm.test.tsx`
- Dependencias: Task 1.3
- Scope: M

### Task 1.5: `ClientesPage` + routing + nav
- Aceptación:
  - `ClientesPage.tsx` orquesta `useClientes` + `ClienteForm` + `ClienteList` (espejo de `ProductosPage`).
  - Ruta `/clientes` añadida en `App.tsx`.
  - Nav link "Clientes" añadido en `Layout.tsx`.
  - CSS Module de página.
  - Navegación funciona y la página carga la lista desde el hook.
- Verificación: `npm run build` y `npm run lint`
- Archivos: `src/pages/ClientesPage.tsx`, `src/pages/ClientesPage.module.css`, `src/App.tsx`, `src/components/Layout.tsx`
- Dependencias: Task 1.4
- Scope: S

### Task 1.6: Integración Pedido → `clienteId` (API + hook + tests)
- Aceptación:
  - `src/api/pedidos.ts` actualizado para persistir/leer los nuevos campos (`clienteId`, `clienteDireccion`, `clienteContacto`, `clienteNombre?`); `createPedido`/`updatePedido` validan con el `PedidoInputSchema` actualizado.
  - `src/hooks/usePedidos.ts` `changeEstado` reconstruye `PedidoInput` con los nuevos campos (no usa `cliente`).
  - `tests/api/pedidos.test.ts` actualizado: `pedidoInput` usa `clienteId` + snapshots; tests de create/list/get/update/delete/validación pasan.
  - `tests/hooks/usePedidos.test.tsx` actualizado al nuevo shape.
- Verificación: `npm test -- pedidos`
- Archivos: `src/api/pedidos.ts`, `src/hooks/usePedidos.ts`, `tests/api/pedidos.test.ts`, `tests/hooks/usePedidos.test.tsx`
- Dependencias: Task 1.1, Task 1.2
- Scope: M

### Task 1.7: UI Pedido — selector de cliente + display en lista
- Aceptación:
  - `PedidoForm.tsx` reemplaza input libre de `cliente` por un `<select>` de clientes (cargados vía `useClientes` o prop `clientes`) + opción "Nuevo cliente…" que permite crear inline (captura direccion/contacto/nombre y llama `findOrCreateCliente` o al `create` del hook). Al seleccionar/crear, setea `clienteId` y snapshot-eea direccion/contacto/nombre en el `PedidoInput`.
  - `PedidoList.tsx` muestra `clienteDireccion` (y `clienteNombre` si existe) en la columna Cliente.
  - `PedidosPage.tsx` provee `clientes` al `PedidoForm` (vía `useClientes`).
  - `tests/components/PedidoForm.test.tsx` actualizado: provee `clientes`, simula selección de cliente, verifica `onSubmit` recibe `clienteId` + snapshots.
- Verificación: `npm test -- PedidoForm` y `npm run build`
- Archivos: `src/components/PedidoForm.tsx`, `src/components/PedidoList.tsx`, `src/pages/PedidosPage.tsx`, `tests/components/PedidoForm.test.tsx`
- Dependencias: Task 1.6, Task 1.3
- Scope: M

### Task 1.8: Migración de pedidos existentes (backfill `clienteId`)
- Aceptación:
  - Script de migración que lee todos los docs de `pedidos` con `cliente: string` y sin `clienteId`; por cada valor único de `cliente` crea (o reutiliza vía `findOrCreateCliente`) un doc `clientes` con `direccion = <cliente>`, `contacto = "(migrado)"`, `nombre = <cliente>`; luego actualiza el pedido con `clienteId` + snapshots y elimina el campo `cliente` legacy.
  - Documento `docs/migration-clientes.md` con instrucciones de ejecución, idempotencia y rollback.
  - Script ejecutable en seco (dry-run) que reporta cuántos pedidos migrar sin escribir.
- Verificación: revisión manual del script + doc; `npm run build` (el script debe tipar).
- Archivos: `src/scripts/migratePedidosCliente.ts`, `docs/migration-clientes.md`
- Dependencias: Task 1.6
- Scope: S

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pedidos existentes en Firestore con `cliente: string` quedan huérfanos tras eliminar el campo | Alto: `PedidoList` no renderiza cliente, validación Zod falla al editar | Task 1.8 (migración con backfill + snapshots). Mientras tanto, `PedidoList` tolera `clienteNombre` faltante mostrando `clienteDireccion ?? '—'`. |
| Duplicados de cliente (misma direccion+contacto creados dos veces) rompen agrupación del Req 2 | Alto: delivery único no funciona | `findOrCreateCliente` con query `where('direccion','==',…)` + `where('contacto','==',…)`. Considerar regla Firestore de unicidad post-MVP. |
| `PedidoForm` pierde la capacidad de cliente libre/on-the-fly si el usuario no quiere pre-registrar | Medio: fricción UX | Opción "Nuevo cliente…" inline en el selector (Task 1.7) que crea el cliente al vuelo. |
| Snapshot de cliente se desactualiza si se edita el cliente después | Bajo: solo display del pedido histórico se ve stale (esperado por convención snapshot) | Documentar que el snapshot es intencional (igual que nombre/precio en items). El pedido refleja el cliente al momento de crearse. |
| Eliminar un cliente referenciado por pedidos | Medio: pedidos quedan con `clienteId` inválido | No se elimina en cascade; el snapshot en el pedido preserva el display. Opcional: validar referencias antes de `deleteCliente` (open question). |
| `mockFirestore` no soporta `orderBy`/`limit`/`startAfter` (paginación) | Bajo: no se usa paginación en clientes en este req | Si se añade `getClientesPaginated`, extender el mock. Fuera de scope de Req 1. |

## Dependencias con otros requisitos

- **Req 2 (delivery):** depende directamente de `clienteId` estable para agrupar pedidos del mismo cliente en un delivery único. `findOrCreateCliente` (Task 1.2) es la base para identificar "mismo cliente". El snapshot de direccion/contacto en el pedido sirve al display del delivery.
- **Req 3 (reportes/estadísticas, si existe):** podrá agrupar pedidos por `clienteId` en lugar de por string libre, dando métricas consistentes por cliente.
- **Req 4 (edición de cliente / historial, si existe):** la colección `clientes` ya habilita edición centralizada; el snapshot en pedidos mantiene el histórico inmutable.
- **Req 5 (búsqueda/filtrado de pedidos por cliente, si existe):** podrá filtrar por `clienteId` (indexable) en vez de texto libre.
- **Req 6 (cualquier feature que asigne pedidos a clientes):** requiere `clienteId`; este req lo provee.
- Nota: las dependencias futuras asumen que la migración (Task 1.8) se ejecutó para que todos los pedidos tengan `clienteId`.

## Open questions

1. ¿Se incluye `creadoPor` / `actualizadoEn` en `clientes` para trazabilidad? (Recomendado: sí, alineado con colaciones.)
2. ¿`findOrCreateCliente` debe normalizar direccion/contacto (trim, lowercase de direccion) antes de buscar para evitar duplicados por diferencias de mayúsculas/espacios?
3. ¿Se debe impedir `deleteCliente` si tiene pedidos referenciando ese `clienteId` (validación de integridad), o se permite y se confía en el snapshot?
4. Migración (Task 1.8): ¿`contacto` de clientes migrados desde `cliente: string` histórico se setea en `"(migrado)"` (placeholder) o se fuerza al operador a completarlo después? ¿Se migran automáticamente o se dejan los pedidos viejos como legacy y solo los nuevos usan `clienteId`?
5. ¿El selector de cliente en `PedidoForm` carga todos los clientes (puede crecer) o se añade búsqueda/autocomplete? (Para MVP: `<select>` simple; evaluar paginación/autocomplete en Req 5.)
6. ¿Se necesita índice compuesto Firestore en `(direccion, contacto)` para la query de `findOrCreateCliente`? (En modo test no, pero post-MVP sí — documentar en `firestore.rules`/índices.)
