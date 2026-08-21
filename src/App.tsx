import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProductosPage } from './pages/ProductosPage';
import { PedidosPage } from './pages/PedidosPage';
import { ColacionesPage } from './pages/ColacionesPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/colaciones" replace />} />
        <Route path="/colaciones" element={<ColacionesPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/pedidos" element={<PedidosPage />} />
      </Route>
    </Routes>
  );
}
