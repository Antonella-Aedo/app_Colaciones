# Plan: Filtros de pedidos + vista Tablero/Lista

## Objetivo

Agregar filtros de alto valor a la pantalla de Pedidos y un toggle de vista entre el tablero kanban actual y una vista de tabla. Sin romper la estética existente.

## Requisitos (confirmados con el usuario)

1. **Toggle global Tablero/Lista**: par de botones segmentados arriba del tablero que alternan entre la vista kanban y una tabla con todos los pedidos (filtrados). Los filtros aplican a ambas vistas.
2. **Filtros de alto valor**:
   - Fecha (rango desde/hasta + botón "Hoy" + limpiar)
   - Estado (chips toggle multi-selección, 4 estados)
   - Cliente (búsqueda de texto sobre nombre o dirección)
   - Tipo de entrega (delivery/retiro) y Estado de pago (pendiente/pagado)

## Arquitectura

### Lógica de filtrado (pura, testeable)

`src/utils/pedidoFiltros.ts` — función pura `filtrarPedidos(pedidos, filtros)` + tipo `FiltrosPedido`. Sigue el patrón de `src/utils/pedidoEstado.ts` (helper de dominio puro). Unit-testeada con Vitest (TDD).

```ts
interface FiltrosPedido {
  fechaDesde: string | null;   // ISO yyyy-MM-dd (inclusivo)
  fechaHasta: string | null;   // ISO yyyy-MM-dd (inclusivo)
  estados: EstadoPedido[];     // [] = todos
  cliente: string;             // texto libre, case-insensitive, sobre nombre|direccion
  tiposEntrega: TipoEntrega[]; // [] = todos
  estadosPago: EstadoPago[];   // [] = todos
}
```

### Componentes (composición, < 200 líneas c/u)

Refactor de `PedidoList` (actualmente 310 líneas) en:

- `PedidoList.tsx` — contenedor: estado de filtros + vista, computa pedidos filtrados, renderiza `<PedidoFiltros>`, toggle de vista, y `<PedidoTablero>` | `<PedidoTabla>`. Pasa handlers.
- `PedidoFiltros.tsx` — barra de filtros controlada (recibe valores + onChange).
- `PedidoTablero.tsx` — kanban actual extraído tal cual (carriles por estado).
- `PedidoTabla.tsx` — nueva vista tabla (usa estilos `table` globales de global.css).

Cada uno con su CSS Module. El sistema de diseño (tokens, rieles de estado, elevación) se reutiliza sin cambios.

### Vista Tabla

Columnas: Fecha · Cliente · Estado · Entrega · Pago · Método · Total · Acciones (editar/eliminar/cambiar estado). Reusa handlers existentes. Estados terminales deshabilitan editar como en el tablero. Usa `table` global + riel de estado en la celda Estado.

### Métricas (resumen)

Reflejan el conjunto filtrado (no el total), para que el operador vea el impacto de sus filtros.

## Tareas

1. TDD: `src/utils/pedidoFiltros.ts` + `tests/utils/pedidoFiltros.test.ts`
2. Extraer `PedidoTablero.tsx` + `.module.css` (mover código actual, sin cambios de comportamiento)
3. Crear `PedidoFiltros.tsx` + `.module.css`
4. Crear `PedidoTabla.tsx` + `.module.css`
5. Refactorizar `PedidoList.tsx` + `.module.css` como contenedor
6. `npm test` + `npm run build` + `npm run lint`

## Boundaries

- Always: reutilizar tokens del design system (global.css), no inventar colores/espaciados.
- Always: TDD para la lógica de filtrado.
- Never: romper la vista kanban existente (solo se mueve a su propio componente).
- Never: añadir dependencias nuevas.

## Criterios de éxito

- [ ] Filtrar por fecha/estado/cliente/entrega/pago reduce el tablero y la tabla.
- [ ] Toggle Tablero/Lista cambia la vista sin perder los filtros aplicados.
- [ ] Tabla muestra todos los pedidos filtrados con acciones consistentes al tablero.
- [ ] `npm test` pasa (incluye tests de pedidoFiltros).
- [ ] `npm run build` + `npm run lint` sin errores.
- [ ] Estética consistente con el design system (rieles de estado, tokens, elevación).
