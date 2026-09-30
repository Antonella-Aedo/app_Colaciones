# Spec: Botón "Buscar actualizaciones" en el Login (git pull + reinicio)

## Objective

En la pantalla de login el usuario puede:

1. Presionar **"Buscar actualizaciones"** → el proceso principal consulta el repo git
   (`git fetch` + comparación contra la rama remota).
2. Si hay commits nuevos → mensaje **"Existen actualizaciones disponibles"** y aparece
   el botón **"Actualizar ahora"**.
3. Si no hay → mensaje **"El sistema está actualizado"**.
4. Al actualizar: `git pull --ff-only` → `npm install` → `npm run build` → la app se
   reinicia sola (`app.relaunch()` + `app.exit()`), mostrando una **pantalla de carga**
   a pantalla completa con el paso en curso.
5. Todo fallo produce un **mensaje claro en español** (sin stderr crudo) y permite reintentar.

## Supuestos (corrígeme si alguno no aplica)

1. El chequeo NO hace `git pull` (mutaría el working tree solo por consultar). Usa
   `git fetch` + `git rev-list --count HEAD..@{u}` — el resultado es equivalente y
   no tiene efectos secundarios.
2. El botón es **manual** (el usuario lo presiona); no hay chequeo automático al abrir.
3. La feature solo corre cuando la app se ejecuta **desde el código fuente**
   (`npm run dev` / `npm run app`). En el `.exe` empaquetado no hay repo git → la UI
   muestra una nota de "no disponible", no un error.
4. Tras actualizar, la app reinicia en **modo producción** (`electron .` sobre `dist/`
   recién compilado), aunque se haya lanzado con `--dev`. Motivo: `concurrently -k`
   mata al dev server de vite al cerrarse electron, así que reabrir en modo dev
   dejaría pantalla en blanco. La build previa garantiza que el relanzamiento cargue
   el código nuevo.
5. `git pull --ff-only` (nunca merge commits). Si hay cambios locales que chocan,
   falla con mensaje claro en vez de dejar el repo a medias.
6. `npm install` se ejecuta siempre tras el pull (idempotente, cubre deps nuevas).

## Tech Stack

- Misma stack del proyecto: Electron 44 (main CJS + preload CJS), React 18 + TS,
  CSS Modules, Vitest + RTL.

## Project Structure (archivos nuevos / tocados)

```
electron/
├── updater.mjs        → NUEVO. Lógica git/npm del update (ESM, inyectable, testeable)
├── main.cjs           → registra IPC 'update:check' | 'update:apply' + relaunch
└── preload.cjs        → expone window.actualizador { verificar, aplicar, onProgreso }
src/
├── api/updates.ts     → NUEVO. Cliente tipado del bridge + tipos compartidos
├── hooks/useActualizacion.ts        → NUEVO. Máquina de estados del flujo
├── components/ActualizacionPanel.tsx       → NUEVO. UI (botón, banners, overlay)
├── components/ActualizacionPanel.module.css → NUEVO
└── pages/LoginPage.tsx → integra <ActualizacionPanel />
tests/
├── helpers/testUpdater.ts           → NUEVO. Fake de window.actualizador
├── updater/updater.test.ts          → NUEVO. updater.mjs con execFile inyectado
├── api/updates.test.ts              → NUEVO. Cliente renderer (sin bridge / errores)
└── components/ActualizacionPanel.test.tsx → NUEVO. Estados de la UI
```

## Code Style

- Español en UI y comentarios (convención del repo), TS estricto sin `any`,
  un componente por archivo, CSS Modules con tokens `var(--…)` de `global.css`.
- `updater.mjs` usa **inyección de dependencias** (`crearActualizador({ ejecutar })`)
  para que los tests no ejecuten git/npm reales — DIP.
- Errores como `ErrorActualizacion` con `code` + mensaje usuario-legible.

## Testing Strategy

- `updater.test.ts`: parseo de `rev-list`, mapeo de errores (sin git / sin red /
  sin upstream / conflicto local / fallo de build), orden de pasos.
- `updates.test.ts`: bridge ausente → error claro; payload bien formado.
- `ActualizacionPanel.test.tsx`: render del botón, ambos mensajes, overlay de carga
  con paso, error + reintento, estado "no soportado".
- Regresión: `tests/components/LoginPage.test.tsx` sigue pasando sin cambios.

## Boundaries

- **Always:** `npm test` + `npm run lint` + `npm run build` verdes al final.
- **Ask first:** (ninguna dependencia nueva; todo con node:child_process y Electron).
- **Never:** ejecutar git/npm desde el renderer; todo pasa por IPC del proceso
  principal. `app.relaunch()` sin el flag `--dev`.

## Success Criteria

- [ ] Botón en login → "Existen actualizaciones disponibles" o "El sistema está actualizado".
- [ ] Con updates: botón "Actualizar ahora" → overlay de carga con pasos → pull +
      install + build → electron se cierra y reabre solo.
- [ ] Errores con mensajes claros (sin red, sin git, conflicto local, fallo build).
- [ ] En .exe empaquetado: nota de "no disponible", sin crash.
- [ ] Tests nuevos + suite completa pasan; lint y build limpios.
