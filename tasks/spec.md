# Spec: Cliente opcional al crear pedido

## Objective

Al crear un pedido en modo "cliente nuevo", el usuario debe poder elegir **no persistir** el cliente en la colección `clientes`. El pedido se guarda igual, usando los snapshots inline (`clienteNombre`, `clienteDireccion`, `clienteContacto`), pero sin crear un registro de cliente ni guardar una referencia `clienteId`.

**Historia de usuario:** Como operador, quiero poder registrar un pedido para un cliente nuevo sin obligatoriamente guardarlo en el catálogo de clientes (ej. pedido único/ocasional), para no ensuciar el catálogo con clientes que probablemente no vuelvan a pedir.

**Decisiones confirmadas con el usuario:**
1. Cuando NO se guarda el cliente → no se registra en la colección `clientes`; `clienteId` queda como string vacío `''`; el pedido vive solo con sus snapshots.
2. El checkbox "Guardar cliente" aparece **desmarcado por defecto** (no guardar).
3. La opción aplica **solo al crear** un pedido nuevo. Al editar, el flujo se mantiene igual.

## Tech Stack

- React 18 + TypeScript 5, Vite 5
- Firebase Firestore (web SDK 12)
- Zod 3 (validación runtime en la capa de API)
- Vitest 2 + Testing Library (tests)

## Commands

```
Build:    npm run build
Test:     npm test
Lint:     npm run lint
Dev:      npm run dev
```

## Project Structure (archivos relevantes)

```
src/types/index.ts            → Tipos Pedido, PedidoInput, Cliente
src/api/schemas.ts            → Esquemas Zod (PedidoInputSchema exige clienteId min(1))
src/api/pedidos.ts            → createPedido/updatePedido (pasan por schema)
src/api/clientes.ts           → findOrCreateCliente (persiste en colección clientes)
src/hooks/useClientes.ts      → hook findOrCreate
src/components/PedidoForm.tsx → Formulario: modo 'existente' | 'nuevo', submit
src/pages/PedidosPage.tsx     → Cablea onCrearCliente → findOrCreate
src/components/PedidoList.tsx → Muestra pedidos con snapshots (NO usa clienteId)
tests/components/PedidoForm.test.tsx → Tests del formulario
tests/api/pedidos.test.ts     → Tests de la API + validación runtime
```

## Code Style

- Estado con `useState`; handlers nombrados (`handleX`).
- Validación de UI antes del submit con `setError` + `return` temprano.
- Estilos via CSS Modules (`styles.field`, `styles.row`, etc.).
- Comentarios en español, explicando el "por qué" de decisiones no obvias.

Ejemplo del patrón de toggle existente (modoCliente):
```tsx
const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente');
// ...
<button data-activo={modoCliente === 'existente'} onClick={() => setModoCliente('existente')}>
```

## Testing Strategy

- Framework: Vitest + @testing-library/react. Tests en `tests/` espejando `src/`.
- **Test de componente (PedidoForm):** al crear con cliente nuevo y checkbox desmarcado, `onSubmit` recibe `clienteId === ''` y `onCrearCliente` **no** es invocado.
- **Test de componente:** al marcar el checkbox, `onCrearCliente` sí es invocado y `clienteId` es el id retornado (comportamiento actual).
- **Test de API (schemas):** `PedidoInputSchema.parse` acepta `clienteId: ''` (relajación del schema).
- **Test de API (createPedido):** crea un pedido con `clienteId: ''` sin error.
- Cobertura: mantener/cubrir las ramas nuevas del submit.

## Boundaries

- **Always:** Correr `npm test` antes de considerar la tarea lista; mantener los tests existentes pasando; validar inputs.
- **Ask first:** Cambiar reglas de Firestore security (no se requiere aquí).
- **Never:** Romper la compatibilidad de pedidos existentes (los que ya tienen `clienteId` válido siguen funcionando); eliminar tests existentes sin aprobación.

## Success Criteria

- [ ] En modo "cliente nuevo" aparece un checkbox "Guardar cliente en el catálogo", desmarcado por defecto.
- [ ] Con checkbox desmarcado: al guardar, NO se llama a `onCrearCliente` y el pedido se envía con `clienteId: ''` y los snapshots (nombre/dirección/contacto) ingresados.
- [ ] Con checkbox marcado: comportamiento actual (se llama `onCrearCliente` → `findOrCreate`, `clienteId` = id retornado).
- [ ] `PedidoInputSchema` acepta `clienteId: ''` (relajado de `min(1)` a permitir vacío).
- [ ] `createPedido` persiste correctamente un pedido con `clienteId: ''`.
- [ ] Al editar un pedido existente no aparece la opción (flujo de edición sin cambios).
- [ ] `PedidoList` sigue mostrando el pedido (usa snapshots, no `clienteId`).
- [ ] `npm test` pasa; `npm run build` (tsc) pasa sin errores de tipos.

## Open Questions

Ninguna (todas resueltas con el usuario).
