import type { ReactNode } from 'react';
import { Drawer as Vaul } from 'vaul';
import styles from './Drawer.module.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Título del panel. Vive acá y no en el `<form>`: el encabezado es chrome del
   * drawer, no del formulario. Alimenta el `Drawer.Title` de Radix, que es lo
   * que da nombre accesible al diálogo.
   */
  title: string;
  /** Ancho del panel. PedidoForm necesita más aire que el resto. */
  ancho?: string;
  children: ReactNode;
}

export function Drawer({ open, onOpenChange, title, ancho, children }: Props) {
  return (
    <Vaul.Root direction="left" open={open} onOpenChange={onOpenChange}>
      <Vaul.Portal>
        <Vaul.Overlay className={styles.overlay} />
        <Vaul.Content
          className={styles.panel}
          style={ancho ? { width: ancho } : undefined}
          /* Sin Description: se silencia el aviso de Radix en vez de inventar una. */
          aria-describedby={undefined}
          /* Radix enfoca el panel al abrir; esto deja ganar al autoFocus del
             primer campo, que es donde la persona va a escribir. */
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className={styles.header}>
            <Vaul.Title className={styles.title}>{title}</Vaul.Title>
            <button
              type="button"
              className={styles.cerrar}
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className={styles.body}>{children}</div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
