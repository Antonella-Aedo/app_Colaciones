# Plan Req 4: Permisos de edición de estado

## Resumen

El Requisito 4 establece que la edición del estado de un pedido solo puede realizarla un usuario autenticado y autorizado (presente en `usuariosPermitidos`). La app ya exige login + autorización a nivel de UI (`AuthGate` en `App.tsx` + verificación contra `usuariosPermitidos` en `auth.tsx`), pero existen tres brechas que este plan cierra:

1. **Guard de rutas**: el `AuthGate` actual envuelve todo `<Routes>` y muestra `LoginPage` inline si no hay `user`. Funciona, pero no usa el patrón de ruta protegida de React Router (no hay redirect a `/login`, no hay ruta `/login` declarada). Se confirma que el acceso a `/pedidos` sin auth es imposible hoy, pero se endurece el patrón para claridad y mantenimiento.
2. **Firestore Rules**: las rules están en MODO 3 (SEGURO), pero `isAuthedAdmin()` solo verifica `request.auth != null` — **no verifica `usuariosPermitidos`**. Cualquier usuario autenticado en Firebase (incluso si no está en la lista) puede leer y escribir en `pedidos` via SDK directo. Esta es la brecha de seguridad crítica.
3. **Auditoría**: no existe registro de quién cambió el estado ni cuándo. Se añaden `estadoActualizadoPor`, `estadoActualizadoEn` y un array `historialEstados` al modelo de `Pedido`.

## Decisiones de arquitectura

### Guard de rutas
- **Decisión**: mantener el patrón de `AuthGate` como wrapper único (ya bloquea effectively todas las rutas), pero extraerlo a un componente `ProtectedRoute` reutilizable que use `<Navigate to="/login" />` para redirección explícita. Se añade una ruta `/login` declarada en el router.
- **Razón**: el patrón actual funciona pero es frágil — si alguien añade una ruta fuera de `AuthGate` en el futuro, quedaría expuesta. Un `<ProtectedRoute>` que envuelve cada ruta protegida (o el `Layout` outlet) hace la intención explícita y es el patrón estándar de React Router.
- **Alternativa considerada**: dejar `AuthGate` como está. Descartada porque el requisito pide "confirmar" el guard, y extraerlo cuesta poco y mejora claridad.

### Firestore Rules — verificación de autorización
- **Decisión**: modificar `isAuthedAdmin()` para que, además de `isSignedIn()`, verifique que el email del usuario exista en `usuariosPermitidos`:
  ```
  function isAuthedAdmin() {
    return isSignedIn()
      && get(/databases/$(database)/documents/usuariosPermitidos/$(request.auth.token.email.lowercase())).exists();
  }
  ```
  (Nota: las rules no tienen `.lowercase()`; se usa el email tal cual viene del token. Se documenta que los doc IDs en `usuariosPermitidos` deben coincidir exactamente con el email del token de Auth, o se almacenan ambas variantes.)
- **Razón**: esta es la única forma de cerrar la brecha en el plano de datos. La verificación en `auth.tsx` es solo UI; un atacante con la config de Firebase puede escribir directamente via SDK.
- **Impacto**: `get()` en rules cuenta como una lectura de documento por request evaluado. Aceptable para el volumen de esta app.
- **Precaución**: las rules se deben desplegar con `firebase deploy --only firestore:rules`. Se debe probar en staging antes de producción. Si un usuario legítimo no aparece en `usuariosPermitidos` con el email exacto del token, quedará bloqueado a nivel de DB.

### Auditoría de cambios de estado
- **Decisión**: añadir dos campos planos (`estadoActualizadoPor: string`, `estadoActualizadoEn: string` ISO timestamp) más un array embebido `historialEstados: CambioEstado[]` para el historial completo.
- **Razón**: los campos planos dan el "último cambio" de forma barata para mostrar en la UI sin procesar el array. El array da auditoría completa. Un subarray embebido es suficiente para el volumen esperado (estados cambian pocas veces por pedido).
- **`CambiosEstado`** (nuevo tipo embebido):
  ```
  estado: EstadoPedido       // 'pendiente' | 'entregado' | 'cancelado'
  cambiadoPor: string        // email del usuario
  cambiadoEn: string         // ISO timestamp
  ```
- **Precaución crítica**: `updatePedido` usa `setDoc` (reemplazo completo del documento). Si se añaden los campos de auditoría al documento pero no al `PedidoInputSchema` / allowlist de rules, `setDoc` los borraría en cada edición completa. Se debe decidir:
  - **Opción A (recomendada)**: crear una función API separada `cambiarEstadoPedido(id, estado, usuario)` que use `updateDoc` (merge) y escriba solo `{ estado, estadoActualizadoPor, estadoActualizadoEn, historialEstados: arrayUnion(...) }`. Esto desacopla el cambio de estado de la edición completa del pedido y evita el problema de `setDoc`.
  - **Opción B**: incluir los campos de auditoría en `PedidoInputSchema` y en el allowlist de rules, y que `changeEstado` los reconstruya. Más frágil y acopla auditoría a la edición general.
  - **Se elige Opción A** por seguridad y separación de responsabilidades.

## Cambios al modelo de datos

### `Pedido` (colección `pedidos`)
Campos nuevos (opcionales para retrocompatibilidad con documentos existentes):

```
estadoActualizadoPor?: string      // email del último usuario que cambió el estado
estadoActualizadoEn?: string       // ISO timestamp del último cambio de estado
historialEstados?: CambioEstado[]  // historial completo de cambios de estado
```

### `CambioEstado` (nuevo tipo embebido, no es colección propia)
```
estado: EstadoPedido
cambiadoPor: string    // email
cambiadoEn: string     // ISO timestamp
```

### `PedidoInput` — sin cambios
Los campos de auditoría **no** se incluyen en `PedidoInput` porque se gestionan exclusivamente desde `cambiarEstadoPedido` (Opción A). La edición general de un pedido via `updatePedido` no toca la auditoría de estado.

### `usuariosPermitidos` — sin cambios de schema
Pero se debe garantizar que los doc IDs coincidan con el email del token de Firebase Auth (ver Open Questions).

### Firestore Rules — `pedidoValido()`
- El allowlist actual `['fecha', 'cliente', 'registradoPor', 'colacionId', 'items', 'total', 'estado']` debe extenderse para permitir los nuevos campos: `estadoActualizadoPor`, `estadoActualizadoEn`, `historialEstados`.
- **Pero** como `cambiarEstadoPedido` usa `updateDoc` (no `setDoc`), las rules de `update` validan `request.resource.data` (el documento resultante). Se debe ajustar `pedidoValido()` para que acepte los campos nuevos como opcionales, o crear una función de validación separada para updates parciales de estado.
- **Decisión**: dividir la regla de `update` en dos condiciones:
  - `update` general (edición completa via `setDoc`): valida `pedidoValido()` con allowlist extendido (incluye campos de auditoría como opcionales).
  - `update` de solo estado: permite si el request solo modifica `{ estado, estadoActualizadoPor, estadoActualizadoEn, historialEstados }` y los valores son válidos. Se puede validar con `request.resource.data` diff o con una función `cambioEstadoValido()`.

## Tareas (vertical slices, <5 archivos c/u)

### Task 4.1: Guard de rutas explícito con React Router
- **Aceptación**:
  - Existe una ruta `/login` declarada que renderiza `LoginPage`.
  - Las rutas protegidas (`/colaciones`, `/productos`, `/pedidos`) están envueltas por un `ProtectedRoute` que redirige a `/login` si `!user` (o a un spinner si `loading`).
  - No se puede acceder a `/pedidos` sin sesión: la URL redirige a `/login`.
  - `AuthGate` se elimina o se refactoriza como `ProtectedRoute`.
- **Verificación**:
  - Navegar a `/pedidos` sin sesión → redirige a `/login`.
  - Navegar a `/pedidos` con sesión → renderiza la página.
  - Durante `loading` → muestra spinner, no flashea contenido.
  - `npm run build` sin errores de TS.
- **Archivos**:
  - `src/App.tsx` (refactor de rutas)
  - `src/components/ProtectedRoute.tsx` (nuevo, ~20 líneas)
  - `src/pages/LoginPage.tsx` (sin cambios funcionales, ya existe)
- **Dependencias**: ninguna.
- **Scope**: solo routing. No toca Firestore ni lógica de pedidos.

### Task 4.2: Firestore Rules — verificar `usuariosPermitidos` en `isAuthedAdmin()`
- **Aceptación**:
  - `isAuthedAdmin()` verifica `isSignedIn()` **Y** que el email del usuario exista en `usuariosPermitidos`.
  - Un usuario autenticado en Firebase pero **no** en `usuariosPermitidos` no puede leer ni escribir en ninguna colección.
  - Un usuario autenticado **y** en `usuariosPermitidos` puede operar normalmente.
  - Las rules se desplegaron con `firebase deploy --only firestore:rules` en staging y se verificó.
- **Verificación**:
  - Con sesión de usuario autorizado → CRUD funciona.
  - Con sesión de usuario NO autorizado (crear un usuario de prueba en Firebase Auth no listado en `usuariosPermitidos`) → todas las operaciones de Firestore fallan con permission-denied.
  - Sin sesión → todas las operaciones fallan.
  - `firebase deploy --only firestore:rules --dry-run` pasa sin errores de sintaxis.
- **Archivos**:
  - `firestore.rules` (modificar `isAuthedAdmin()`)
- **Dependencias**: ninguna (puede ir en paralelo con 4.1).
- **Scope**: solo rules. No toca código de la app. **Es un cambio de seguridad — debe revisarse cuidadosamente y probarse en staging antes de producción.**
- **Riesgo**: si los doc IDs en `usuariosPermitidos` no coinciden exactamente con el email del token de Auth (case, dominio), todos los usuarios legítimos quedan bloqueados. Ver Open Questions.

### Task 4.3: Modelo de datos + API — auditoría de cambio de estado
- **Aceptación**:
  - `Pedido` incluye campos opcionales `estadoActualizadoPor`, `estadoActualizadoEn`, `historialEstados`.
  - Existe `CambioEstado` en `types/index.ts`.
  - Nueva función `cambiarEstadoPedido(id, estado, usuario)` en `api/pedidos.ts` que usa `updateDoc` (merge) y escribe:
    - `estado: nuevoEstado`
    - `estadoActualizadoPor: usuario.email`
    - `estadoActualizadoEn: new Date().toISOString()`
    - `historialEstados: arrayUnion({ estado, cambiadoPor, cambiadoEn })`
  - `usePedidos.changeEstado` usa `cambiarEstadoPedido` en vez de `apiUpdate` (que hace `setDoc` completo).
  - `usePedidos.changeEstado` recibe el usuario (desde `useAuth`) o lo obtiene internamente.
  - Pedidos existentes sin los campos nuevos no rompen la lectura (campos opcionales).
- **Verificación**:
  - Cambiar estado de un pedido → en Firestore aparecen `estadoActualizadoPor`, `estadoActualizadoEn` y una entrada en `historialEstados`.
  - Cambiar estado dos veces → `historialEstados` tiene 2 entradas, `estadoActualizadoPor/En` reflejan el último.
  - `PedidoList` sigue funcionando (no muestra los campos nuevos aún — eso es Task 4.5).
  - `npm test` pasa (tests de `api/pedidos` actualizados).
  - `npm run build` sin errores.
- **Archivos**:
  - `src/types/index.ts` (añadir `CambioEstado`, campos en `Pedido`)
  - `src/api/pedidos.ts` (nueva función `cambiarEstadoPedido`)
  - `src/api/schemas.ts` (esquema para `CambioEstado` si se valida; o skip si se confía en el caller)
  - `src/hooks/usePedidos.ts` (`changeEstado` usa nueva API + usuario)
- **Dependencias**: Task 4.2 (las rules deben permitir `updateDoc` con los campos nuevos) — **bloqueante**.
- **Scope**: modelo + API + hook. No toca UI todavía.

### Task 4.4: Firestore Rules — allowlist extendido + validación de cambio de estado
- **Aceptación**:
  - `pedidoValido()` (o una función separada) acepta los campos nuevos `estadoActualizadoPor`, `estadoActualizadoEn`, `historialEstados` como opcionales.
  - Un `update` que solo modifique `{ estado, estadoActualizadoPor, estadoActualizadoEn, historialEstados }` pasa la validación.
  - Un `update` que intente escribir campos fuera del allowlist es rechazado.
  - `historialEstados` se valida como `list` con items que tienen `estado` válido, `cambiadoPor` string, `cambiadoEn` string.
- **Verificación**:
  - `cambiarEstadoPedido` desde la app funciona contra las rules desplegadas.
  - Intentar escribir un campo arbitrario via SDK → rechazado.
  - `firebase deploy --only firestore:rules --dry-run` pasa.
- **Archivos**:
  - `firestore.rules` (extender `pedidoValido()` o añadir `cambioEstadoValido()`)
- **Dependencias**: Task 4.2 (misma base de `isAuthedAdmin`), Task 4.3 (para conocer los campos exactos).
- **Scope**: solo rules. **Cambio de seguridad — probar en staging.**

### Task 4.5: UI — mostrar quién y cuándo cambió el estado
- **Aceptación**:
  - `PedidoList` muestra `estadoActualizadoPor` y `estadoActualizadoEn` (formateado) en la columna de Estado o en una columna/sub-fila nueva.
  - Si el pedido no tiene esos campos (pedidos antiguos), muestra "—" sin romper.
  - Opcional: tooltip o expandable que muestra el `historialEstados` completo.
- **Verificación**:
  - Tras cambiar estado, la tabla muestra el email del usuario y timestamp.
  - Pedidos antiguos sin auditoría muestran "—".
  - `npm run build` sin errores.
- **Archivos**:
  - `src/components/PedidoList.tsx` (render de campos nuevos)
  - `src/components/PedidoList.module.css` (estilos si se añade columna/sub-fila)
- **Dependencias**: Task 4.3 (los campos deben existir en el modelo y llegar via `usePedidos`).
- **Scope**: solo presentación.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Rules bloquean a todos los usuarios legítimos** si los doc IDs de `usuariosPermitidos` no coinciden exactamente con el email del token de Auth | Alto — app completamente inaccesible | Auditar `usuariosPermitidos` antes de desplegar. Probar en staging con usuarios reales. Tener un rollback de rules listo. |
| **`get()` en rules añade latencia** a cada operación de Firestore | Bajo — una lectura extra por request | Aceptable para el volumen de esta app. No hay optimización necesaria en MVP. |
| **`setDoc` en `updatePedido` borra campos de auditoría** si no se separa el cambio de estado | Alto — se pierde la auditoría | Opción A: `cambiarEstadoPedido` usa `updateDoc` (merge). La edición general via `setDoc` no toca los campos de auditoría. |
| **Pedidos existentes sin campos nuevos** rompen la lectura | Medio | Campos opcionales (`?`) en `Pedido`. La UI maneja `undefined` con fallback "—". |
| **`arrayUnion` en `historialEstados`** puede crecer sin límite si un pedido cambia de estado muchas veces | Bajo — los estados son 3 y los cambios son pocos por pedido | No aplicar límite en MVP. Documentar como deuda técnica. Si crece, migrar a subcolección. |
| **Despliegue de rules en producción sin probar** | Alto — puede romper la app para todos | Siempre desplegar en staging primero. Usar `--dry-run`. Tener rollback de rules versionado en git. |
| **Usuario no autorizado pero autenticado en Firebase** puede intentar escribir via SDK | Alto — brecha de seguridad actual | Task 4.2 cierra esta brecha. Es el cambio más importante del requisito. |

## Dependencias con otros requisitos

- **Req 1-3 (Auth, Login, CRUD)**: este requisito asume que el flujo de auth ya funciona. Depende de `AuthProvider` y `usuariosPermitidos` ya implementados.
- **Req 5 (si existe, historial/auditoría general)**: si hay un requisito de auditoría más amplio, el `historialEstados` de este plan es un caso específico. Coordinar para no duplicar.
- **No hay dependencias bloqueantes** con otros requisitos beyond auth ya funcional.

## Open questions

1. **¿Roles diferenciados o todos los autorizados pueden cambiar estado?**
   El requisito dice "el mismo que tiene permiso para entrar". Esto sugiere que **todo** usuario en `usuariosPermitidos` puede cambiar estado (no hay roles finos). Pero no está explícito si se quiere diferenciar entre:
   - **Operadores** (pueden registrar pedidos y cambiar estado).
   - **Visores** (pueden ver pero no cambiar estado).
   - **Admins** (pueden todo + gestionar `usuariosPermitidos`).
   **Recomendación para MVP**: todos los autorizados pueden cambiar estado. Si se necesitan roles, añadir un campo `rol` en los docs de `usuariosPermitidos` y verificarlo en rules + UI. **Esperar confirmación del stakeholder antes de implementar roles.**

2. **¿Los doc IDs de `usuariosPermitidos` coinciden exactamente con el email del token de Firebase Auth?**
   `auth.tsx` hace `email.toLowerCase()` para buscar el doc. Pero las rules de Firestore no tienen `.lowercase()`. Si los doc IDs están en minúsculas pero el token trae mayúsculas, la verificación en rules fallará. **Opciones**:
   - Asegurar que los doc IDs estén en el case exacto del email de Auth (frágil).
   - Almacenar el email en minúsculas como un campo dentro del doc y buscar por query (no se puede en rules con `get()` por ID).
   - **Recomendación**: normalizar los doc IDs a minúsculas Y verificar en rules con el email del token en minúsculas. Las rules **sí** permiten `request.auth.token.email` pero no transformaciones de string. Se debe validar si el token de Google siempre trae el email en un case consistente. **Confirmar con datos reales antes de desplegar rules.**

3. **¿Mostrar el historial completo de estados en la UI o solo el último cambio?**
   Task 4.5 incluye solo el último cambio (`estadoActualizadoPor/En`). El historial completo (`historialEstados`) se almacena pero no se muestra por defecto. ¿Se quiere un expandable/tooltip con el historial? **Decisión postergada a feedback de UI.**

4. **¿`cambiadoPor` almacena email o uid de Firebase Auth?**
   `registradoPor` hoy es texto libre. Para consistencia y para que las rules puedan verificar, `estadoActualizadoPor` debería ser el **email** (que es lo que se verifica contra `usuariosPermitidos`). El `uid` no sirve para cruzar con `usuariosPermitidos`. **Recomendación**: usar email.
