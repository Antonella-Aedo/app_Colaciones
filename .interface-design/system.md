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
| Drawer | `direction="left"` (Vaul) · ancho `min(480px,100vw)`, 600 en Pedidos · header sticky 56px con `Drawer.Title` · body con scroll · `--surface-1` + `--elev-3` · `--radius-xl` solo en el borde derecho · `100vw` bajo 600px |
| Sección de formulario | `<fieldset>` sin borde · `--surface-2` · pad 16 · radio `--radius-lg` · `<legend>` 11px/700 mayúscula `--track-wide` `--text-muted` |

## Reglas duras
1. Ningún color/radio/espacio literal en un CSS module. Siempre `var(--…)`.
2. Categoría nueva → se agrega en `src/constants/categorias.ts` **y** en
   `global.css`. En ningún otro archivo.
3. Encabezado de página → siempre `components/PageHeader`. Nunca estilos inline.
4. Toda vista de datos necesita: loading (skeleton), vacío real, vacío por
   filtro, y error.
5. El color nunca porta información solo: siempre acompañado de su etiqueta.
6. **Toda creación/edición de entidad se abre en un Drawer.** No hay formularios
   inline. El `<form>` no lleva fondo ni sombra propios — sería una card dentro
   de otra.
7. **El título vive en el Drawer, nunca en el `<form>`.** El encabezado es chrome
   del panel. Un prop `titulo` en el form que se oculta dentro del drawer deja el
   camino probado por los tests fuera de producción.
8. **No reescribir la animación de Vaul.** Ya trae `slideFromLeft` / `fadeIn` y
   sus selectores ganan en especificidad; escribir keyframes propios los deja a
   medio aplicar. Se ajusta solo `animation-duration` / `animation-timing-function`,
   y **solo en la apertura**: Vaul ata el desmontaje del nodo a la duración de
   cierre.
9. **Foco en el drawer**: `onOpenAutoFocus={(e) => e.preventDefault()}` para que
   gane el `autoFocus` del primer campo en vez del foco al panel.

## Banco de pruebas
`preview.html` + `src/preview.tsx` — vistas con datos falsos, sin Firebase.
`npm run dev` → `/preview.html`. Solo dev, fuera del build.
