import { Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './firebase/auth';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProductosPage } from './pages/ProductosPage';
import { PedidosPage } from './pages/PedidosPage';
import { ColacionesPage } from './pages/ColacionesPage';
import { ClientesPage } from './pages/ClientesPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/colaciones" replace />} />
            <Route path="/colaciones" element={<ColacionesPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
