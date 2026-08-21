import { useState } from 'react';
import { usePedidos } from '../hooks/usePedidos';
import { useProductos } from '../hooks/useProductos';
import { useColaciones } from '../hooks/useColaciones';
import { useClientes } from '../hooks/useClientes';
import { PedidoList } from '../components/PedidoList';
import { PedidoForm } from '../components/PedidoForm';
import { PageHeader } from '../components/PageHeader';
import type { EstadoPedido, Pedido, PedidoInput } from '../types';
import styles from './PedidosPage.module.css';

export function PedidosPage() {
  const { pedidos, loading, error, create, update, remove, changeEstado, confirmarPago, verificarDireccion } = usePedidos();
  const { productos } = useProductos();
  const { colaciones } = useColaciones();
  const { clientes } = useClientes();
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

  const handleConfirmarPago = (id: string) => {
    void confirmarPago(id);
  };

  return (
    <div>
      <PageHeader
        titulo="Pedidos"
        descripcion="Tablero por estado: cada pedido avanza de Creado a Entregado siguiendo las transiciones válidas."
        acciones={
          !mostrandoForm && (
            <button
              className="primary"
              onClick={() => {
                setEditando(null);
                setMostrandoForm(true);
              }}
            >
              Nuevo pedido
            </button>
          )
        }
      />

      {mostrandoForm && (
        <div className={styles.formWrapper}>
          <PedidoForm
            inicial={editando}
            productos={productos}
            colaciones={colaciones}
            clientes={clientes}
            onSubmit={handleSubmit}
            onVerificarDireccion={verificarDireccion}
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
        onConfirmarPago={handleConfirmarPago}
      />
    </div>
  );
}
