import { useActualizacion } from '../hooks/useActualizacion';
import styles from './ActualizacionPanel.module.css';

/** Texto de cada paso del apply — el proceso principal lo reporta por IPC. */
const TEXTO_PASO: Record<string, string> = {
  descargando: 'Descargando los cambios del repositorio…',
  instalando: 'Instalando dependencias…',
  compilando: 'Compilando la nueva versión…',
  reiniciando: 'Reiniciando la aplicación…',
};

function IconoBuscar({ girando }: { girando: boolean }) {
  return (
    <svg
      className={girando ? styles.girando : undefined}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function IconoEstado({ tipo }: { tipo: 'info' | 'ok' | 'error' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      {tipo === 'ok' ? (
        <path d="m9 12 2 2 4-4" />
      ) : tipo === 'error' ? (
        <>
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </>
      ) : (
        <>
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </>
      )}
    </svg>
  );
}

/**
 * Zona de auto-update del login. Deliberadamente terciaria: el foco de la
 * pantalla es el ingreso; esto es una utilidad discreta al pie del panel.
 *
 * Flujo: "Buscar actualizaciones" → banner (al día / hay cambios / error /
 * no soportado) → "Actualizar ahora" → overlay a pantalla completa mientras
 * el proceso principal hace pull + install + build y relanza la app.
 */
export function ActualizacionPanel() {
  const { estado, resultado, paso, error, verificar, aplicar } = useActualizacion();

  const verificando = estado === 'verificando';
  const actualizando = estado === 'actualizando';
  const noSoportado = estado === 'listo' && resultado?.soportado === false;
  const conUpdates = estado === 'listo' && resultado?.disponible === true;
  const alDia = estado === 'listo' && resultado?.soportado === true && !resultado.disponible;

  const pendientes = resultado?.pendientes ?? 0;
  const textoCambios =
    pendientes === 1 ? '1 cambio pendiente' : `${pendientes} cambios pendientes`;

  return (
    <div className={styles.zona}>
      {noSoportado ? (
        <p className={styles.nota}>
          La actualización automática no está disponible en esta instalación.
        </p>
      ) : (
        <button
          type="button"
          className={styles.buscar}
          onClick={verificar}
          disabled={verificando || actualizando}
        >
          <IconoBuscar girando={verificando} />
          {verificando ? 'Buscando…' : 'Buscar actualizaciones'}
        </button>
      )}

      {conUpdates && (
        <div className={`${styles.banner} ${styles.info}`} role="status">
          <IconoEstado tipo="info" />
          <div className={styles.bannerTexto}>
            <p className={styles.bannerTitulo}>Existen actualizaciones disponibles</p>
            <p className={styles.bannerDetalle}>
              {textoCambios}
              {resultado?.rama ? ` en la rama ${resultado.rama}` : ''}. La aplicación se
              reiniciará al terminar.
            </p>
          </div>
          <button type="button" className={`primary ${styles.cta}`} onClick={aplicar}>
            Actualizar ahora
          </button>
        </div>
      )}

      {alDia && (
        <div className={`${styles.banner} ${styles.ok}`} role="status">
          <IconoEstado tipo="ok" />
          <p className={styles.bannerTexto}>El sistema está actualizado.</p>
        </div>
      )}

      {estado === 'error' && (
        <div className={`${styles.banner} ${styles.error}`} role="alert">
          <IconoEstado tipo="error" />
          <p className={styles.bannerTexto}>{error}</p>
          <button type="button" className={`danger ${styles.reintentar}`} onClick={verificar}>
            Reintentar
          </button>
        </div>
      )}

      {actualizando && (
        <div className={styles.overlay} role="status" aria-live="polite">
          <div className={styles.cargaCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <h2 className={styles.cargaTitulo}>Actualizando el sistema</h2>
            <p className={styles.cargaPaso}>
              {TEXTO_PASO[paso ?? 'descargando'] ?? 'Actualizando…'}
            </p>
            <p className={styles.cargaNota}>No cierres la aplicación.</p>
          </div>
        </div>
      )}
    </div>
  );
}
