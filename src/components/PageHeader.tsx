import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface Props {
  titulo: string;
  /** Una línea que explica de qué trata la sección. Opcional. */
  descripcion?: string;
  /** Acciones primarias de la página (botones). */
  acciones?: ReactNode;
}

/**
 * Encabezado único de página. Antes cada página resolvía esto por su cuenta
 * (dos con estilos inline, dos con CSS modules distintos), y el resultado eran
 * cuatro jerarquías tipográficas diferentes.
 */
export function PageHeader({ titulo, descripcion, acciones }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.textos}>
        <h2 className={styles.titulo}>{titulo}</h2>
        {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
      </div>
      {acciones && <div className={styles.acciones}>{acciones}</div>}
    </header>
  );
}
