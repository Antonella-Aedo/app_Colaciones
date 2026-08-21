import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../firebase/auth';

/**
 * Guard de rutas: redirige a /login si no hay usuario autenticado.
 * Muestra un spinner mientras se resuelve el estado de autenticación.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
