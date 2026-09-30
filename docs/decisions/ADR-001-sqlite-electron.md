# ADR-001: SQLite local + Electron en lugar de Firebase

## Status
Accepted

## Date
2026-09-26 (retroactivo — documentado junto a ADR-002)

## Context

La app original usaba Firebase (Firestore + Google Auth). El usuario pidió
reemplazarla por "una base de datos local, fácil de instalar, que se prenda
cada vez que se corra el programa", más un empaquetador de escritorio estilo
Electron.

Restricciones clave:

- Cero servicios externos: app de escritorio, offline-first.
- "Fácil de instalar" descartaba addons nativos que compilan con node-gyp
  (requieren Visual Studio Build Tools en Windows).
- UnQLite fue pedido explícitamente, pero su único binding en npm
  (`unqlite@0.3.5`) es un addon nativo abandonado desde 2017 que no compila
  en Node 24/Windows.

## Decision

- **better-sqlite3** como motor embebido. Entrega un único binario
  `win32-x64.node` ABI-estable (node-api): funciona dentro de Electron sin
  rebuild ni herramientas de compilación.
- **Modelo documental sobre SQLite**: tabla por colección
  (`id TEXT PRIMARY KEY`, `data TEXT` JSON), filtros con `json_extract`.
  Conserva la semántica Firestore-like que la app ya usaba.
- **Electron** para empaquetado (`electron-builder` → portable.exe + NSIS).
  El proceso principal abre la DB en `app.whenReady()` → la DB "se prende
  cada vez que corre el programa".
- DB en `%APPDATA%\app-colaciones\colaciones.db` (ruta por usuario, sobrevive
  actualizaciones del .exe). Auth local por correo contra colección
  `usuariosPermitidos` (mantiene el modelo anterior sin OAuth).
- API del renderer idéntica en forma a la anterior (`getX`, `createX`,
  `updateX`, `removeX`) para minimizar cambios en hooks/componentes.

## Alternatives Considered

### UnQLite
- Pros: pedido explícito; documental nativo.
- Contras: binding npm muerto desde 2017, addon nativo que exige compilar.
- Rechazado: incompatible con "fácil de instalar".

### sql.js / SQLite WASM
- Pros: cero binario nativo.
- Contras: la DB vive en memoria; persistir exige volcar el archivo a disco
  manualmente (más código y riesgo de pérdida).
- Rechazado: worse persistence story para una app de escritorio.

### Archivo JSON plano (lowdb-style)
- Pros: simplicidad máxima.
- Contras: reescritura completa por operación, sin transacciones, crece
  lineal en costo.
- Rechazado: sin garantías ACID para pedidos.

## Consequences

- `electron/db.mjs` concentra toda la persistencia; el renderer la consume
  vía IPC (`window.colaciones` inyectado por `preload.cjs`).
- Los tests corren la DB real con `:memory:` (`installTestDb`), no mocks.
- `electron-builder` corre con `npmRebuild: false` — el binario
  ABI-estable de better-sqlite3 se empaqueta tal cual.
- Migraciones de colecciones/tablas se hacen dentro de `createDb`
  (ver ADR-002).
