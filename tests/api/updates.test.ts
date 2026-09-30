/**
 * Tests del cliente renderer del auto-update (src/api/updates.ts).
 * Cubren el contrato IPC como datos: sin bridge → "no soportado",
 * sin excepciones de dominio.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  aplicarActualizacion,
  suscribirProgreso,
  verificarActualizaciones,
} from '../../src/api/updates';
import { installTestUpdater, uninstallTestUpdater } from '../helpers/testUpdater';

afterEach(uninstallTestUpdater);

describe('updates api — sin bridge (navegador / test sin Electron)', () => {
  it('verificar resuelve "no soportado" en vez de lanzar', async () => {
    const r = await verificarActualizaciones();
    expect(r.soportado).toBe(false);
  });

  it('aplicar resuelve error claro en vez de lanzar', async () => {
    const r = await aplicarActualizacion();
    expect(r.ok).toBe(false);
    expect(r.error?.mensaje).toMatch(/aplicación de escritorio/);
  });

  it('suscribirProgreso devuelve un unsubscribe inerte', () => {
    const off = suscribirProgreso(() => {});
    expect(() => off()).not.toThrow();
  });
});

describe('updates api — con bridge', () => {
  it('verificar delega en el bridge y devuelve su resultado', async () => {
    const { bridge } = installTestUpdater({
      verificar: () =>
        Promise.resolve({ soportado: true, disponible: true, pendientes: 2, rama: 'development' }),
    });
    const r = await verificarActualizaciones();
    expect(bridge.verificar).toHaveBeenCalledOnce();
    expect(r).toMatchObject({ disponible: true, pendientes: 2 });
  });

  it('aplicar delega en el bridge y propaga el error de dominio', async () => {
    const { bridge } = installTestUpdater({
      aplicar: () =>
        Promise.resolve({
          ok: false,
          paso: 'descargando',
          error: { code: 'CONFLICTO_LOCAL', mensaje: 'Hay cambios locales que chocan.' },
        }),
    });
    const r = await aplicarActualizacion();
    expect(bridge.aplicar).toHaveBeenCalledOnce();
    expect(r.error?.code).toBe('CONFLICTO_LOCAL');
  });

  it('suscribirProgreso registra el callback y el unsubscribe lo quita', async () => {
    const { emitirPaso } = installTestUpdater();
    const cb = vi.fn();
    const off = suscribirProgreso(cb);
    emitirPaso('descargando');
    expect(cb).toHaveBeenCalledWith('descargando');
    off();
    emitirPaso('instalando');
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
