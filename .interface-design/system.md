# system.md — decisiones persistidas

Leído automáticamente por la skill `interface-design` en sesiones futuras.
Las decisiones ya están tomadas: aplicarlas, no reabrirlas.
Contexto completo y razonamiento: [`/DESIGN.md`](../DESIGN.md).

## Dirección
Familia **Playful Color** (Figma / Toss / Duolingo) aterrizada al mundo de la
colación chilena. Vivo y ordenado; nunca infantil, nunca ERP frío.

## Firma
**Riel de compartimento**, 3px, color tomado del alimento real.
- Categoría de producto → riel **superior** (taxonomía).
- Estado de pedido → riel **izquierdo** (avance temporal).
- El logo es una bandeja de tres compartimentos con los mismos tokens.

## Profundidad
UNA estrategia: anillo hairline + sombra suave en capas (`--elev-1/2/3`).
Prohibido mezclar con bordes duros o cambios de color de superficie.
Inputs hundidos (`--surface-sunken`).

## Base
- Espaciado: grilla **4px**, solo múltiplos.
- Tipografía: Plus Jakarta Sans Variable, **self-hosted** (el CSP es
  `font-src 'self'` — no agregar Google Fonts).
- Escala tipográfica: ratio **1.25** desde 14px → 11/12/14/16/18/22/28/36.
- Jerarquía con tres palancas: tamaño + peso + color. Nunca solo tamaño.
- Radio: 6 chips · 8 inputs/botones · 12 cards · 16 paneles · 20 modales · 999 píldoras.
- Color 60/30/10. El color significa; no decora.
- Movimiento < 300ms, `--ease-out`, `scale(0.97)` al presionar.

## Patrones de componente (valores a reusar)

| Componente | Medidas |
|---|---|
| Botón base | 36px alto · 8/16px pad · radio 8 · 14px/600 |
| Botón en card | 30px alto · 4/8px pad · 12px/600 · radio 6 |
| Card de producto | pad 16 · radio 12 · riel superior 3px · grid `auto-fill minmax(232px, 1fr)` gap 16 |
| Card de pedido | pad 16 (pad-left 19) · radio 12 · riel izquierdo 3px |
| Chip de filtro | 32px alto · radio píldora · activo = `--cat-soft` + texto `--cat` |
| Carril del tablero | `minmax(288px, 1fr)` · scroll horizontal · apila bajo 900px |
| Métrica | label 11px/600 mayúscula muted · valor 28px/700 tabular · meta 12px terciario |
| PageHeader | título 28px/700 · descripción 14px terciario · margen inferior 24 |

## Reglas duras
1. Ningún color/radio/espacio literal en un CSS module. Siempre `var(--…)`.
2. Categoría nueva → se agrega en `src/constants/categorias.ts` **y** en
   `global.css`. En ningún otro archivo.
3. Encabezado de página → siempre `components/PageHeader`. Nunca estilos inline.
4. Toda vista de datos necesita: loading (skeleton), vacío real, vacío por
   filtro, y error.
5. El color nunca porta información solo: siempre acompañado de su etiqueta.

## Banco de pruebas
`preview.html` + `src/preview.tsx` — vistas con datos falsos, sin Firebase.
`npm run dev` → `/preview.html`. Solo dev, fuera del build.
