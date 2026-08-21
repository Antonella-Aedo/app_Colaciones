import { useState } from 'react';
import { usePedidos } from '../hooks/usePedidos';
import { useProductos } from '../hooks/useProductos';
import { useColaciones } from '../hooks/useColaciones';
import { PedidoList } from '../components/PedidoList';
import { PedidoForm } from '../components/PedidoForm';
import type { PedidoInput } from '../types';

export function PedidosPage() {
  const { pedidos, loading, error, create } = usePedidos();
  const { productos } = useProductos();
  const { colaciones } = useColaciones();
  const [mostrandoForm, setMostrandoForm] = useState(false);

  const handleSubmit = async (input: PedidoInput) => {
    await create(input);
    setMostrandoForm(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Pedidos</h2>
        {!mostrandoForm && (
          <button className="primary" onClick={() => setMostrandoForm(true)}>Nuevo pedido</button>
        )}
      </div>

      {mostrandoForm && (
        <div style={{ marginBottom: '1.5rem' }}>
          <PedidoForm
            productos={productos}
            colaciones={colaciones}
            onSubmit={handleSubmit}
            onCancel={() => setMostrandoForm(false)}
          />
        </div>
      )}

      <PedidoList pedidos={pedidos} loading={loading} error={error} />
    </div>
  );
}
