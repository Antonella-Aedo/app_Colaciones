import { useState } from 'react';
import { useAuth } from '../firebase/auth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { loginWithGoogle, authError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setEnviando(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.form}>
        <h1 className={styles.title}>Colaciones — Iniciar sesión</h1>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {authError && <p className={styles.error} role="alert">{authError}</p>}
        <div className={styles.actions}>
          <button
            type="button"
            className="primary"
            onClick={handleGoogleLogin}
            disabled={enviando}
          >
            {enviando ? 'Ingresando…' : 'Iniciar sesión con Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
