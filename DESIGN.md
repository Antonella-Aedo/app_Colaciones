# DESIGN.md — app_Colaciones

Dirección de arte y reglas de interfaz. Este archivo manda sobre cualquier
default: si una decisión visual no está aquí, se decide aquí antes de escribirla
en CSS.

**Skill que gobierna este trabajo:** [`interface-design`](https://github.com/Dammyjay93/interface-design)
(Dammyjay93), instalada en `~/.claude/skills/interface-design`.
Comandos: `/interface-design`, `/interface-design:design-review`,
`/interface-design:design-deslop`.

---

## 1. Intención

**Quién es la persona.** No "usuarios": la persona que administra las colaciones.
Está en la cocina o en la oficina, entre las 9:00 y las 13:00, con las manos
ocupadas y el teléfono o un notebook al lado. Cinco minutos antes estaba
recibiendo un pedido por WhatsApp; cinco minutos después tiene que decirle al
repartidor qué sale primero.

**Qué tiene que lograr.** Ver de un vistazo qué se debe cocinar, qué está pagado
y qué sale a reparto — y mover un pedido de estado sin pensarlo.

**Cómo se tiene que sentir.** Vivo y ordenado. No frío como un ERP ni infantil
como una app de juegos: la energía de Toss o Figma con la disciplina de un panel
de operación. Familia estética: **Playful Color**.

---

## 2. Exploración del dominio

**Dominio (el mundo del producto):** la bandeja con compartimentos · la pizarra
del menú del día · fondo / agregado / ensalada · el tupper que se cierra · la
hora de almuerzo · la ruta de reparto · el ticket de cocina.

**Mundo de color (colores que existen de verdad ahí):** rojo tomate y pimentón ·
verde lechuga · amarillo choclo · morado betarraga · verde palta · azul del agua
y el tupper · blanco arroz.

**Firma visual: EL RIEL DE COMPARTIMENTO.** Cada card lleva un riel de 3px con
el color de su clasificación, igual que el separador de una bandeja. Dos ejes,
dos posiciones — el color nunca es ambiguo:

| Eje | Posición del riel | Significa |
|---|---|---|
| Categoría de producto | riel **superior** | taxonomía (qué es) |
| Estado de pedido | riel **izquierdo** | avance en el tiempo (dónde va) |

La misma lógica es el logo: una bandeja de tres compartimentos pintada con
`--cat-fondo`, `--cat-ensalada` y `--cat-agregado`.

**Defaults rechazados:**

| Default | Qué se hizo en su lugar |
|---|---|
| Tabla para todo | Grid de cards agrupadas por categoría; tablero por estado |
| Un solo verde de marca pintando el header entero | 60/30/10: el header es superficie neutra, el color se reserva para lo que comunica |
| Badge de estado en una celda de tabla | Carriles por estado, con conteo y monto por carril |
| Header distinto por página (dos con estilos inline) | Un solo `PageHeader` |

---

## 3. Sistema

Todos los tokens viven en `src/styles/global.css`. **Ningún color, radio o
espacio se escribe a mano en un CSS module** — siempre `var(--…)`.

### Tipografía
- **Plus Jakarta Sans Variable**, self-hosted vía `@fontsource-variable`.
  Se auto-hospeda a propósito: mantiene intacto el `font-src 'self'` del CSP en
  `firebase.json`. No agregar Google Fonts.
- Escala 1.25 desde base 14px: `11 · 12 · 14 · 16 · 18 · 22 · 28 · 36`.
- La jerarquía se construye con **tres palancas juntas** (tamaño + peso + color),
  nunca solo con tamaño.
- Tracking óptico: cuanto más grande el tipo, más apretado (`--track-tight`).
- Toda cifra dinámica lleva `font-variant-numeric: tabular-nums`.

### Espaciado
Grilla de **4px**. Solo múltiplos. `--space-1` … `--space-12`.
Densidad elegida: componente 16px, sección 24px, entre grupos 40px.

### Profundidad — UNA sola estrategia
Anillo hairline + sombra suave en capas (`--elev-1` / `--elev-2` / `--elev-3`).
**No mezclar** con bordes duros ni con cambios de color de superficie.
Las superficies mantienen un solo matiz y solo cambian de luminosidad.
Los inputs son **hundidos** (`--surface-sunken`, más oscuros que su entorno).

### Radio — escala
`6px` chips · `8px` inputs y botones · `12px` cards · `16px` paneles · `20px`
modales · `999px` píldoras. Radio concéntrico: `radio_externo = radio_interno + padding`.

### Color — 60/30/10
Superficie neutra domina, el acento no pasa del ~10%. El color **significa**:
categoría (`--cat-*`), estado (`--estado-*`), semántica (`--danger`, `--warning`,
`--success`, `--info`) o acción primaria (`--brand-700`). Color decorativo: no.

Los `--cat-*` salen del alimento real y su origen está documentado en
`src/constants/categorias.ts`. Si se agrega una categoría, se agrega ahí y en
`global.css` — en ningún otro lugar.

### Movimiento
Duraciones < 300ms. `--ease-out` para entradas, nunca `ease-in`.
`scale(0.97)` al presionar. Solo se anima `transform` y `opacity`.
`prefers-reduced-motion` respetado globalmente.

### Estados obligatorios
Todo control: default, hover, active, focus-visible, disabled.
Toda vista de datos: loading (skeleton), vacío, error, y vacío-por-filtro
distinto de vacío-real.

---

## 4. Accesibilidad

- Foco visible único: `--focus-ring` (3px, verde marca) en todo control.
- Botón primario `--brand-700` sobre blanco ≈ 5.2:1.
- Altura mínima de control 36px (30px para acciones secundarias dentro de card).
- El color nunca es el único portador de información: cada riel de categoría o
  estado va acompañado de su etiqueta en texto.

---

## 5. Banco de pruebas visual

`preview.html` + `src/preview.tsx` renderizan las vistas con datos falsos, sin
Firebase ni sesión. Solo dev — Vite no lo incluye en el build de producción.

```bash
npm run dev
# http://localhost:5173/preview.html
```

Úsalo para revisar jerarquía, densidad y estados sin tener que iniciar sesión
con Google.

---

## 6. Los chequeos, antes de dar algo por terminado

- **Swap test** — si cambias la tipografía por la de siempre y el layout por una
  plantilla estándar, ¿cambiaría algo? Donde no cambie nada, ahí defaulteaste.
- **Squint test** — entrecierra los ojos: ¿se sigue leyendo la jerarquía? ¿algo
  salta de forma agresiva?
- **Signature test** — señala cinco lugares donde aparece el riel de
  compartimento. "El feeling general" no cuenta.
- **Token test** — lee las variables en voz alta: ¿pertenecen a este producto o
  servirían para cualquier proyecto?
