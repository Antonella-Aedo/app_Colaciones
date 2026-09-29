import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Bandeja } from './Bandeja';
import styles from './Layout.module.css';

const SECCIONES = [
  { to: '/colaciones', label: 'Colaciones' },
  { to: '/productos', label: 'Productos' },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/clientes', label: 'Clientes' },
] as const;

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
            <Bandeja className={styles.marca} />
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
