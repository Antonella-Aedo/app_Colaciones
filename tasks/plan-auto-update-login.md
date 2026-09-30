# Plan: Auto-update desde el login

Vertical slices, cada una deja el repo compilando y con tests verdes.

## Slice 1 — `electron/updater.mjs` + tests (lógica pura, mayor riesgo)

- `crearActualizador({ ejecutar, existeGit })` — `ejecutar` = wrapper de
  `execFile` (promisified). Los tests inyectan un fake; producción inyecta el real.
- `verificar()`:
  1. `existeGit(cwd)` → `.git` presente? si no → `{ soportado: false }`
  2. `git fetch --quiet --prune` (timeout 120s)
  3. `git rev-list --count HEAD..@{u}` → pendientes
  4. `git rev-parse --abbrev-ref HEAD` → rama (para el mensaje/logs)
- `aplicar(onPaso)`:
  1. paso `descargando` → `git pull --ff-only`
  2. paso `instalando` → `npm.cmd/npm install --no-audit --no-fund` (300s)
  3. paso `compilando` → `npm run build` (300s)
- `ErrorActualizacion(code, mensaje)`; `clasificarError(err, paso)` mapea
  stderr → mensaje español claro.
- Test: `tests/updater/updater.test.ts`.

## Slice 2 — IPC: preload + main

- `preload.cjs`: `window.actualizador = { verificar, aplicar, onProgreso }`
  (`ipcRenderer.invoke` / `ipcRenderer.on` con cleanup).
- `main.cjs`: handlers `update:check`, `update:apply`.
  - `apply` envía `webContents.send('update:progreso', paso)` por cada paso.
  - Tras apply OK: `app.relaunch({ args: [app.getAppPath()] })` (sin `--dev`) +
    `app.exit(0)`.
  - Repo root = `app.getAppPath()`; `app.isPackaged` → `soportado:false`.

## Slice 3 — Cliente renderer + hook

- `src/api/updates.ts`: tipos (`ResultadoVerificacion`, `PasoActualizacion`),
  `window.actualizador` en `declare global`, funciones `verificarActualizaciones`,
  `aplicarActualizacion`, `suscribirProgreso`. Bridge ausente → `Error` claro.
- `src/hooks/useActualizacion.ts`: estados `inactivo | verificando | listo |
  actualizando`; campos `resultado`, `paso`, `error`. Métodos `verificar()`,
  `aplicar()`. Suscripción a progreso con cleanup.
- Tests: `tests/api/updates.test.ts`, `tests/helpers/testUpdater.ts`.

## Slice 4 — UI `ActualizacionPanel` + integración en LoginPage

- `ActualizacionPanel.tsx` + `.module.css`: botón secundario "Buscar
  actualizaciones" → banner (success / info+cta / danger / nota no-soportado) →
  overlay fullscreen de carga con spinner + paso + "No cierres la ventana".
- Tokens del sistema (`--brand-*`, `--info-soft`, `--success-soft`,
  `--danger-*`, `--elev-3`, radios/espaciados de la grilla 4px).
- `LoginPage.tsx`: `<ActualizacionPanel />` bajo el form, sobre `.pie`.
- Test: `tests/components/ActualizacionPanel.test.tsx`.

## Slice 5 — Verificación y review

- `npm test` (suite completa), `npm run lint`, `npm run build`.
- Review con subagente (rol code-reviewer + test-engineer) sobre el diff.
- Commit por slice.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `concurrently -k` mata vite al relanzar en dev | Relanzar siempre en modo prod (dist recién compilado) |
| `npm` no resuelve en Windows sin shell | `process.platform === 'win32' ? 'npm.cmd' : 'npm'` con execFile |
| `git pull` con working tree sucio | `--ff-only` + clasificar stderr → mensaje claro |
| Branch sin upstream | `@{u}` falla → mensaje "rama sin remoto configurado" |
| Update cortado a medias | pull es atómico por ref; install/build fallidos no impiden reintentar |
