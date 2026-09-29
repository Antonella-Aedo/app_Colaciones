import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
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
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Colaciones — Iniciar sesión</h1>
        {authError && <p className={styles.error} role="alert">{authError}</p>}
        <div className={styles.actions}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
            autoComplete="username"
            autoFocus
          />
          <button type="submit" className="primary" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
      </form>
    </div>
  );
}
