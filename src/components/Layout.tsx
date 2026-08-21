import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../firebase/auth';
import styles from './Layout.module.css';

const SECCIONES = [
  { to: '/colaciones', label: 'Colaciones' },
  { to: '/productos', label: 'Productos' },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/clientes', label: 'Clientes' },
] as const;

/**
 * Marca: una bandeja de tres compartimentos, con los mismos colores que
 * clasifican los productos. El logo y la taxonomía son el mismo sistema.
 */
function Bandeja() {
  return (
    <svg
      className={styles.marca}
      viewBox="0 0 28 24"
      role="img"
      aria-label="Colaciones"
      focusable="false"
    >
      <rect x="0.75" y="0.75" width="26.5" height="22.5" rx="5.5" fill="var(--surface-sunken)" />
      <rect x="3" y="3" width="13" height="18" rx="3" fill="var(--cat-fondo)" />
      <rect x="18" y="3" width="7" height="8" rx="2.5" fill="var(--cat-ensalada)" />
      <rect x="18" y="13" width="7" height="8" rx="2.5" fill="var(--cat-agregado)" />
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="22.5"
        rx="5.5"
        fill="none"
        stroke="rgba(20,32,26,0.12)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function iniciales(email: string): string {
  const local = email.split('@')[0] ?? '';
  const partes = local.split(/[._-]+/).filter(Boolean);
  const letras = partes.length >= 2 ? partes[0][0] + partes[1][0] : local.slice(0, 2);
  return letras.toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.marcaBloque}>
            <Bandeja />
            <span className={styles.titulo}>Colaciones</span>
          </div>

          <nav className={styles.nav} aria-label="Secciones">
            {SECCIONES.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.active}` : styles.link
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.user}>
            {user?.email && (
              <span className={styles.identidad}>
                <span className={styles.avatar} aria-hidden="true">
                  {iniciales(user.email)}
                </span>
                <span className={styles.email} title={user.email}>
                  {user.email}
                </span>
              </span>
            )}
            <button type="button" className={styles.logout} onClick={() => logout()}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
