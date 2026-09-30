import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Bandeja } from '../components/Bandeja';
import { ActualizacionPanel } from '../components/ActualizacionPanel';
import heroImg from '../assets/colacion-hero.jpg';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, login, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión (login exitoso o sesión persistida), salir del login.
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await login(email);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Panel de marca: la colación real — compartimentos con los colores
            de la taxonomía de productos */}
        <aside className={styles.hero}>
          <img className={styles.heroImg} src={heroImg} alt="" />
          <div className={styles.heroScrim}>
            <div className={styles.heroMarca}>
              <Bandeja className={styles.heroLogo} />
              <span className={styles.heroNombre}>Colaciones</span>
            </div>
            <div className={styles.heroPie}>
              <p className={styles.heroTag}>
                El almuerzo del día, de la cocina a la entrega.
              </p>
              <ul className={styles.heroPuntos}>
                <li className={styles.puntoMenu}>Menú del día</li>
                <li className={styles.puntoPedidos}>Pedidos y pagos</li>
                <li className={styles.puntoClientes}>Clientes</li>
              </ul>
            </div>
          </div>
        </aside>

        <section className={styles.panel} aria-labelledby="login-titulo">
          <header className={styles.panelHead}>
            <h1 className={styles.titulo} id="login-titulo">
              Bienvenido
            </h1>
            <p className={styles.subtitulo}>
              Ingresa con tu correo autorizado para gestionar los platos del día.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.campo}>
              <label htmlFor="login-email">Correo</label>
              <div className={styles.inputWrap}>
                <svg
                  className={styles.inputIcono}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.cl"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {authError && (
              <p className={styles.error} role="alert">
                {authError}
              </p>
            )}

            <button type="submit" className={`primary ${styles.submit}`} disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <ActualizacionPanel />

          <p className={styles.pie}>
            Aplicación local — los datos se guardan en este equipo.
          </p>
        </section>
      </div>
    </div>
  );
}
