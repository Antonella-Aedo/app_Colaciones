import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './firebase/auth';
import { Layout } from './components/Layout';
import { ProductosPage } from './pages/ProductosPage';
import { PedidosPage } from './pages/PedidosPage';
import { ColacionesPage } from './pages/ColacionesPage';
import { LoginPage } from './pages/LoginPage';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/colaciones" replace />} />
            <Route path="/colaciones" element={<ColacionesPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
          </Route>
        </Routes>
      </AuthGate>
    </AuthProvider>
  );
}
