/**
 * Cliente renderer del auto-update. `window.actualizador` lo inyecta
 * electron/preload.cjs; en tests se instala un fake (tests/helpers/testUpdater.ts).
 *
 * El contrato cruza IPC como datos: los métodos NO lanzan errores de dominio —
 * devuelven `{ error: { code, mensaje } }` porque Electron serializa las
 * excepciones de ipcMain.handle como texto plano. `mensaje` viene del proceso
 * principal ya redactado en español y es seguro de mostrar al usuario.
 */

/** Pasos del apply que reporta updater.mjs, más 'reiniciando' que emite main. */
export type PasoProgreso = 'descargando' | 'instalando' | 'compilando' | 'reiniciando';

export interface ErrorActualizacion {
  code: string;
  /** Mensaje claro en español, seguro para mostrar en la UI. */
  mensaje: string;
  /** Recorte de stderr — solo diagnóstico, no para la UI. */
  detalle?: string;
}

export interface ResultadoVerificacion {
  /** false = la app no corre desde un repo git (p. ej. el .exe empaquetado). */
  soportado: boolean;
  disponible?: boolean;
  pendientes?: number;
  rama?: string;
  error?: ErrorActualizacion;
}

export interface ResultadoAplicacion {
  ok: boolean;
  paso?: PasoProgreso;
  error?: ErrorActualizacion;
}

export interface ActualizadorBridge {
  verificar(): Promise<ResultadoVerificacion>;
  aplicar(): Promise<ResultadoAplicacion>;
  /** Suscribe al progreso de la actualización; devuelve unsubscribe. */
  onProgreso(cb: (paso: PasoProgreso) => void): () => void;
}

declare global {
  interface Window {
    actualizador?: ActualizadorBridge;
  }
}

const MENSAJE_SIN_BRIDGE =
  'La actualización automática solo está disponible dentro de la aplicación de escritorio.';

/**
 * Consulta al proceso principal si hay commits nuevos en el remoto.
 * Sin bridge (navegador, tests sin fake) equivale a "no soportado".
 */
export function verificarActualizaciones(): Promise<ResultadoVerificacion> {
  return window.actualizador?.verificar() ?? Promise.resolve({ soportado: false });
}

/**
 * Ejecuta pull + install + build. Si `ok`, el proceso principal relanza la
 * app — el renderer muere con la ventana, no hay "éxito" que mostrar.
 */
export function aplicarActualizacion(): Promise<ResultadoAplicacion> {
  return (
    window.actualizador?.aplicar() ??
    Promise.resolve({
      ok: false,
      error: { code: 'SIN_BRIDGE', mensaje: MENSAJE_SIN_BRIDGE },
    })
  );
}

/** Suscripción al progreso; sin bridge devuelve un unsubscribe inerte. */
export function suscribirProgreso(cb: (paso: PasoProgreso) => void): () => void {
  return window.actualizador?.onProgreso(cb) ?? (() => {});
}
