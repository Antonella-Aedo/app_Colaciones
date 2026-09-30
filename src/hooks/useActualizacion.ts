import { useCallback, useEffect, useState } from 'react';
import {
  aplicarActualizacion,
  suscribirProgreso,
  verificarActualizaciones,
  type PasoProgreso,
  type ResultadoVerificacion,
} from '../api/updates';

/**
 * Máquina de estados del auto-update:
 *
 *   inactivo ──verificar()──▶ verificando ──▶ listo (resultado con/sin updates)
 *                                │
 *      error ◀─── (fallo de red/git/etc.) ◀──┘
 *        ▲
 *   listo ──aplicar()──▶ actualizando ──ok──▶ main relanza la app (no vuelve)
 *                           │
 *      error ◀─── (pull/install/build falló)
 *
 * 'listo' + resultado.soportado === false → la UI muestra la nota de
 * "no disponible", no un error: es un estado esperado (app empaquetada).
 */
export type EstadoActualizacion =
  | 'inactivo'
  | 'verificando'
  | 'listo'
  | 'actualizando'
  | 'error';

const ERROR_GENERICO =
  'No se pudo completar la operación. Intenta de nuevo; si persiste, revisa la consola.';

export function useActualizacion() {
  const [estado, setEstado] = useState<EstadoActualizacion>('inactivo');
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);
  const [paso, setPaso] = useState<PasoProgreso | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => suscribirProgreso(setPaso), []);

  const verificar = useCallback(async () => {
    setEstado('verificando');
    setError(null);
    try {
      const r = await verificarActualizaciones();
      if (r.error) {
        setError(r.error.mensaje);
        setEstado('error');
      } else {
        setResultado(r);
        setEstado('listo');
      }
    } catch {
      // Solo un fallo de IPC en sí (canal muerto) llega aquí — los errores
      // de dominio (git, red, npm) vuelven como datos en r.error.
      setError(ERROR_GENERICO);
      setEstado('error');
    }
  }, []);

  const aplicar = useCallback(async () => {
    setEstado('actualizando');
    setPaso('descargando'); // el primer evento real llega por IPC; esto es feedback inmediato
    setError(null);
    try {
      const r = await aplicarActualizacion();
      // r.ok === true → el proceso principal está relanzando la app; el
      // estado 'actualizando' queda pintado hasta que la ventana se cierra.
      if (!r.ok) {
        setPaso(null);
        setError(r.error?.mensaje ?? ERROR_GENERICO);
        setEstado('error');
      }
    } catch {
      setPaso(null);
      setError(ERROR_GENERICO);
      setEstado('error');
    }
  }, []);

  return { estado, resultado, paso, error, verificar, aplicar };
}
