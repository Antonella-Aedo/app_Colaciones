import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../firebase/auth';
import styles from './Layout.module.css';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Colaciones</h1>
        <nav className={styles.nav}>
          <NavLink
            to="/colaciones"
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            Colaciones
          </NavLink>
          <NavLink
            to="/productos"
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            Productos
          </NavLink>
          <NavLink
            to="/pedidos"
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            Pedidos
          </NavLink>
        </nav>
        <div className={styles.user}>
          {user?.email && <span className={styles.email}>{user.email}</span>}
          <button className={styles.logout} onClick={() => logout()}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
