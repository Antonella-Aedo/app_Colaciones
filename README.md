# app_Colaciones

Aplicación de **escritorio** para la gestión de colaciones alimentarias (refrigerios / snacks). Permite administrar un **catálogo de productos** (CRUD), armar **colaciones** (menú del día con roles: fondo, agregado, ensalada, extra) y registrar/listar **pedidos**. Los datos persisten en una **base de datos local SQLite** — sin servicios externos, sin nube, sin config.

## Instalación paso a paso (PC con Windows, partiendo de cero)

Hay dos caminos. Elige el que corresponda:

| Si quieres… | Usa |
|---|---|
| **Solo usar la app** en tu PC | [Opción A](#opción-a--solo-usar-la-app-recomendada) |
| **Modificar el código** o generar el instalador tú mismo | [Opción B](#opción-b--instalar-desde-el-código-fuente-pc-sin-nada) |

### Opción A — Solo usar la app (recomendada)

**Requisito único:** un PC con Windows 10 u 11 (64 bits). No necesitas instalar nada más: la app es autónoma y funciona sin internet.

#### Paso 1 — Consigue el archivo

Existen dos variantes (ambas están en la carpeta `release/` de este proyecto, o te las puede entregar quien la desarrolla — por ejemplo en un pendrive o por correo):

- **`Colaciones-Setup-0.1.0.exe`** → instalador clásico (deja ícono en el menú Inicio y escritorio).
- **`Colaciones-portable.exe`** → versión portable (no se instala: doble clic y funciona desde donde esté el archivo).

#### Paso 2 — Ejecuta el archivo

- **Instalador:** doble clic → elige la carpeta de instalación (o deja la que sugiere) → Instalar → Finalizar. La app queda disponible en el menú Inicio como **"Colaciones"**.
- **Portable:** doble clic sobre el `.exe` y la app abre directamente.

> **Aviso de Windows SmartScreen:** al ser una app sin firma digital de empresa, Windows puede mostrar *"Windows protegió su PC"*. Es normal — haz clic en **"Más información"** → **"Ejecutar de todas formas"**.

#### Paso 3 — Primer inicio

Al abrir, la app se inicializa sola:

- Crea la base de datos en `%APPDATA%\app-colaciones\colaciones.db`.
- Siembra automáticamente el catálogo con 19 productos.
- **Login:** el primer correo que ingreses queda registrado como usuario autorizado. Todos los correos siguientes deberán estar autorizados previamente (los agrega un usuario ya registrado).

#### Desinstalar

- **Instalador:** Configuración de Windows → Aplicaciones → **Colaciones** → Desinstalar.
- **Portable:** simplemente borra el `.exe`.
- **Para borrar también los datos** (productos, pedidos, usuarios): elimina la carpeta `%APPDATA%\app-colaciones`.

---

### Opción B — Instalar desde el código fuente (PC sin nada)

Sirve para correr la app en modo desarrollo o generar los `.exe` tú mismo. Los pasos 1 a 4 se hacen **una sola vez**.

#### Paso 1 — Instalar Node.js

Node.js es el motor que ejecuta las herramientas del proyecto. Incluye `npm` (el instalador de dependencias).

1. Entra a **https://nodejs.org**
2. Descarga el botón verde **"LTS"** (versión recomendada).
3. Ejecuta el instalador descargado: **Next → Next → Install** (deja todas las opciones por defecto — en particular la que agrega Node al PATH).
4. Verifica que quedó instalado: presiona `Win + R`, escribe `cmd`, Enter. En la ventana negra escribe:
   ```
   node -v
   npm -v
   ```
   Deben mostrar versiones (ej. `v22.x.x` y `10.x.x`). Si dice "no se reconoce", cierra sesión o reinicia el PC y repite.

#### Paso 2 — Conseguir el código

Elige una de las dos formas:

**Sin Git (más simple):**
1. En la página del repositorio (GitHub o donde esté alojado), botón **"Code"** → **"Download ZIP"**.
2. Descomprime el ZIP en una carpeta de tu preferencia (ej. `C:\app_Colaciones`).

**Con Git:**
1. Instala Git desde **https://git-scm.com/download/win** (todo con Next → Next → Install).
2. Abre `cmd` en la carpeta donde quieras el proyecto y ejecuta:
   ```
   git clone <url-del-repositorio>
   ```

#### Paso 3 — Abrir una terminal dentro de la carpeta del proyecto

1. Abre la carpeta `app_Colaciones` en el Explorador de archivos.
2. Haz clic en la barra de direcciones (donde sale la ruta), escribe `cmd` y presiona **Enter**. Se abre una terminal ya posicionada en el proyecto.
   - En Windows 11 también puedes: clic derecho dentro de la carpeta → **"Abrir en Terminal"**.

#### Paso 4 — Instalar dependencias

En esa terminal ejecuta:

```
npm install
```

La primera vez tarda unos minutos y **necesita internet** (descarga Electron y el resto de dependencias). No requiere compiladores ni Visual Studio: el motor de base de datos (`better-sqlite3`) viene precompilado.

#### Paso 5 — Correr la app

```
npm run app      # compila y abre la app como en producción
npm run dev      # modo desarrollo: ventana de escritorio con recarga automática
npm run dist     # genera los .exe (instalador + portable) en la carpeta release/
```

#### Solución de problemas

| Problema | Qué hacer |
|---|---|
| `'npm' no se reconoce como un comando` | Cierra y vuelve a abrir la terminal. Si persiste, reinicia el PC (Node recién instalado no se ve en terminales abiertas antes). |
| `npm install` falla descargando `better-sqlite3` o Electron | Revisa conexión a internet / proxy / antivirus y repite `npm install`. |
| `npm install` pide herramientas de compilación (node-gyp) | Instala **Visual Studio Build Tools** con la carga *"Desarrollo para el escritorio con C++"* desde https://visualstudio.microsoft.com/visual-studio-build-tools/ y repite. En PCs normales no debería ocurrir. |
| La ventana de la app abre en blanco en `npm run dev` | Cierra todo y vuelve a correr `npm run dev` (vite a veces tarda más que Electron en levantar). |
| Puerto 5173 ocupado | Cierra otras instancias de `npm run dev` antes de volver a lanzarlo. |

## Stack

- **App de escritorio:** Electron 44 (proceso principal = Node + DB)
- **Persistencia:** SQLite vía `better-sqlite3` (document store: colecciones `productos`, `colaciones`, `pedidos`, `clientes`, `usuariosPermitidos`)
- **Frontend:** React 18 + Vite 5 + TypeScript, CSS Modules, HashRouter
- **Tests:** Vitest + React Testing Library (los tests corren contra la DB real en `:memory:`)

## Estructura

```
electron/
├── main.cjs        → Proceso principal: DB, IPC, ventana
├── preload.cjs     → Expone window.colaciones.invoke() al renderer
├── db.mjs          → Capa de persistencia (document store sobre SQLite)
├── db.d.mts        → Tipos de db.mjs
└── seed-data.mjs   → Catálogo inicial (19 productos)
src/
├── api/            → Capa de acceso a datos (usa window.colaciones vía IPC)
│   └── clientDb.ts → Puente renderer ↔ DB local
├── auth/           → AuthProvider local (sesión + usuariosPermitidos)
├── components/     → Componentes de UI (listas, formularios, layout)
├── hooks/          → Hooks useProductos, useColaciones, usePedidos, useClientes
├── pages/          → Páginas (Productos, Colaciones, Pedidos, Clientes, Login)
├── types/          → Tipos compartidos
└── styles/         → CSS global
apps-script/        → [legacy] Web App de Apps Script (no activo)
tests/              → Tests (api, hooks, componentes, utils)
docs/spec.md        → Especificación del proyecto
```

## Modelo de datos

### Colecciones

- **`productos`**: catálogo con categoría (`fondo`, `agregado`, `ensalada`, `bebida`, `crema`, o custom) y `disponible`.
- **`colaciones`**: menú del día; items con `rol` (`fondo`, `agregado`, `ensalada`, `extra`). Solo una puede estar `activa` a la vez (transacción exclusiva).
- **`pedidos`**: `fecha`, snapshots de cliente, `registradoPor`, `items`, `total`, `estado` (`creado|pagado|finalizado|cancelado`), `tipoEntrega`/`deliveryCost`, `metodoPago`/`estadoPago`, auditoría de estados.
- **`clientes`**: dirección + contacto (normalizados) + nombre opcional.
- **`usuariosPermitidos`**: correos autorizados (id = email lowercase).

## Tests y calidad

```bash
npm test           # suite completa (db :memory: real)
npm run lint       # ESLint
npm run build      # typecheck + bundle
```

## Notas

- `apps-script/` es legacy (backend Google Sheets) y se conserva sin uso.
- Los tests ya no mockean un backend: usan `electron/db.mjs` con SQLite `:memory:` (ver `tests/helpers/testDb.ts`).
- Si la DB fuera a correr en modo navegador (sin Electron), `src/api/clientDb.ts` es el único punto a extender (p. ej. fallback HTTP).
