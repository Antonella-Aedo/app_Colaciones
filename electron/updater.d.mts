/** Tipos de electron/updater.mjs (para tests y para el renderer vía IPC). */

export type PasoActualizacion = 'descargando' | 'instalando' | 'compilando';

export type CodigoErrorActualizacion =
  | 'SIN_GIT'
  | 'SIN_REPO'
  | 'SIN_RED'
  | 'SIN_UPSTREAM'
  | 'CONFLICTO_LOCAL'
  | 'ARCHIVOS_BLOQUEADOS'
  | 'PULL_FALLIDO'
  | 'INSTALL_FALLIDO'
  | 'BUILD_FALLIDO'
  | 'TIMEOUT'
  | 'DESCONOCIDO';

export interface ErrorActualizacionInfo {
  code: CodigoErrorActualizacion;
  /** Mensaje claro en español, seguro para mostrar en la UI. */
  mensaje: string;
  /** Recorte de stderr — solo para logs/diagnóstico, no para la UI. */
  detalle?: string;
}

export interface ResultadoVerificacion {
  /** false = la app no corre desde un repo git (p. ej. .exe empaquetado). */
  soportado: boolean;
  disponible?: boolean;
  pendientes?: number;
  rama?: string;
  error?: ErrorActualizacionInfo;
}

export interface ResultadoAplicacion {
  ok: boolean;
  /** Paso en que falló, si aplica. */
  paso?: PasoActualizacion;
  error?: ErrorActualizacionInfo;
}

export interface OpcionesEjecucion {
  cwd: string;
  timeout?: number;
  shell?: boolean;
  /** Variables extra sobre process.env (p. ej. GIT_TERMINAL_PROMPT=0). */
  env?: Record<string, string>;
}

export interface SalidaComando {
  stdout: string;
  stderr: string;
}

/** Wrapper de execFile — en tests se inyecta un doble. */
export type Ejecutar = (
  comando: string,
  args: string[],
  opts: OpcionesEjecucion,
) => Promise<SalidaComando>;

export interface DepsActualizador {
  ejecutar?: Ejecutar;
  existeGit?: (cwd: string) => boolean;
}

export interface Actualizador {
  verificar(cwd: string): Promise<ResultadoVerificacion>;
  aplicar(
    cwd: string,
    onPaso?: (paso: PasoActualizacion) => void,
  ): Promise<ResultadoAplicacion>;
}

export declare function crearActualizador(deps?: DepsActualizador): Actualizador;
