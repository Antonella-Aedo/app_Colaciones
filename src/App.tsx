import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProductosPage } from './pages/ProductosPage';
import { PedidosPage } from './pages/PedidosPage';
import { PlatosPage } from './pages/PlatosPage';
import { ClientesPage } from './pages/ClientesPage';
import { LoginPage } from './pages/LoginPage';
import { TestColacionesPage } from './pages/TestColacionesPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/platos" replace />} />
            <Route path="/platos" element={<PlatosPage />} />
            <Route path="/colaciones" element={<Navigate to="/platos" replace />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/test" element={<TestColacionesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
