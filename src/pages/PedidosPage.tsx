import { useState } from 'react';
import { usePedidos } from '../hooks/usePedidos';
import { useProductos } from '../hooks/useProductos';
import { useColaciones } from '../hooks/useColaciones';
import { PedidoList } from '../components/PedidoList';
import { PedidoForm } from '../components/PedidoForm';
import type { EstadoPedido, Pedido, PedidoInput } from '../types';

export function PedidosPage() {
  const { pedidos, loading, error, create, update, remove, changeEstado } = usePedidos();
  const { productos } = useProductos();
  const { colaciones } = useColaciones();
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [editando, setEditando] = useState<Pedido | null>(null);

  const handleSubmit = async (input: PedidoInput) => {
    if (editando) {
      await update(editando.id, input);
    } else {
      await create(input);
    }
    setMostrandoForm(false);
    setEditando(null);
  };

  const handleEdit = (p: Pedido) => {
    setEditando(p);
    setMostrandoForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    await remove(id);
  };

  const handleChangeEstado = (id: string, estado: EstadoPedido) => {
    void changeEstado(id, estado);
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
            inicial={editando}
            productos={productos}
            colaciones={colaciones}
            onSubmit={handleSubmit}
            onCancel={() => {
              setMostrandoForm(false);
              setEditando(null);
            }}
          />
        </div>
      )}

      <PedidoList
        pedidos={pedidos}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onChangeEstado={handleChangeEstado}
      />
    </div>
  );
}
