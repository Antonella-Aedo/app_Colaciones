# TODO: Auto-update desde el login

- [ ] Task 1: `electron/updater.mjs` — crearActualizador (verificar/aplicar, DI, errores claros)
  - Acceptance: cubre soportado/disponible/pendientes/rama + pasos descargando→instalando→compilando
  - Verify: `npx vitest run tests/updater`
  - Files: electron/updater.mjs, tests/updater/updater.test.ts

- [ ] Task 2: IPC — preload.cjs expone window.actualizador; main.cjs registra update:check/apply + relaunch
  - Acceptance: bridge con verificar/aplicar/onProgreso; apply → relaunch sin --dev
  - Verify: `npm run build` + revisión de wiring
  - Files: electron/preload.cjs, electron/main.cjs

- [ ] Task 3: Renderer — src/api/updates.ts + src/hooks/useActualizacion.ts
  - Acceptance: tipos completos, bridge ausente → error claro, máquina de estados
  - Verify: `npx vitest run tests/api/updates.test.ts`
  - Files: src/api/updates.ts, src/hooks/useActualizacion.ts, tests/helpers/testUpdater.ts, tests/api/updates.test.ts

- [ ] Task 4: UI — ActualizacionPanel + CSS + integración en LoginPage
  - Acceptance: botón, mensajes success/info/error, overlay con pasos, nota no-soportado
  - Verify: `npx vitest run tests/components/ActualizacionPanel.test.tsx tests/components/LoginPage.test.tsx`
  - Files: src/components/ActualizacionPanel.tsx, src/components/ActualizacionPanel.module.css, src/pages/LoginPage.tsx, tests/components/ActualizacionPanel.test.tsx

- [ ] Task 5: Verificación global — suite completa, lint, build, review con subagente
  - Acceptance: `npm test` + `npm run lint` + `npm run build` verdes; review aprobado
  - Verify: comandos npm + reporte del subagente
  - Files: los del diff completo
