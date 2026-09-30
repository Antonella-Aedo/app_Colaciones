/**
 * Helper de tests: instala un doble de window.actualizador (el bridge que el
 * preload de Electron inyecta en producción). Mismo patrón que testDb.ts —
 * el renderer habla con el contrato, no con Electron de verdad.
 */
import { vi } from 'vitest';
import type {
  ActualizadorBridge,
  PasoProgreso,
  ResultadoAplicacion,
  ResultadoVerificacion,
} from '../../src/api/updates';

export interface FakeActualizador {
  bridge: ActualizadorBridge;
  /** Emite un paso de progreso como lo haría el proceso principal. */
  emitirPaso(paso: PasoProgreso): void;
}

interface Respuestas {
  verificar?: () => Promise<ResultadoVerificacion>;
  aplicar?: () => Promise<ResultadoAplicacion>;
}

export function installTestUpdater(respuestas: Respuestas = {}): FakeActualizador {
  let onPaso: ((paso: PasoProgreso) => void) | undefined;
  const bridge: ActualizadorBridge = {
    verificar: vi.fn(
      respuestas.verificar ??
        (() =>
          Promise.resolve<ResultadoVerificacion>({
            soportado: true,
            disponible: false,
            pendientes: 0,
            rama: 'development',
          })),
    ),
    aplicar: vi.fn(respuestas.aplicar ?? (() => Promise.resolve<ResultadoAplicacion>({ ok: true }))),
    onProgreso: (cb) => {
      onPaso = cb;
      return () => {
        onPaso = undefined;
      };
    },
  };
  window.actualizador = bridge;
  return { bridge, emitirPaso: (paso) => onPaso?.(paso) };
}

export function uninstallTestUpdater(): void {
  delete window.actualizador;
}
