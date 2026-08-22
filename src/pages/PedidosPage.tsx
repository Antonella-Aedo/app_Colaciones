import { useState } from 'react';
import { usePedidos } from '../hooks/usePedidos';
import { useProductos } from '../hooks/useProductos';
import { useColaciones } from '../hooks/useColaciones';
import { useClientes } from '../hooks/useClientes';
import { PedidoList } from '../components/PedidoList';
import { PedidoForm } from '../components/PedidoForm';
import { PageHeader } from '../components/PageHeader';
import { Drawer } from '../components/Drawer';
import type { ClienteInput, EstadoPedido, Pedido, PedidoInput } from '../types';
import styles from './PedidosPage.module.css';

export function PedidosPage() {
  const { pedidos, loading, error, create, update, remove, changeEstado, confirmarPago, verificarDireccion } = usePedidos();
  const { productos } = useProductos();
  const { colaciones } = useColaciones();
  const { clientes, findOrCreate } = useClientes();
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [editando, setEditando] = useState<Pedido | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const handleSubmit = async (input: PedidoInput) => {
    if (editando) {
      await update(editando.id, input);
    } else {
      await create(input);
    }
    setMostrandoForm(false);
  };

  // No se limpia `editando` al cerrar: Vaul mantiene el contenido montado
  // durante la animación de salida y el formulario parpadearía a vacío. Cada
  // camino de apertura fija `editando` explícitamente.
  const cerrarForm = () => setMostrandoForm(false);

  const handleEdit = (p: Pedido) => {
    setEditando(p);
    setMostrandoForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    await remove(id);
  };

  const handleChangeEstado = async (id: string, estado: EstadoPedido) => {
    setErrorEstado(null);
    try {
      await changeEstado(id, estado);
    } catch (err) {
      setErrorEstado(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    }
  };

  const handleConfirmarPago = async (id: string) => {
    setErrorEstado(null);
    try {
      await confirmarPago(id);
    } catch (err) {
      setErrorEstado(err instanceof Error ? err.message : 'No se pudo confirmar el pago');
    }
  };

  const handleCrearCliente = async (input: ClienteInput) => {
    return findOrCreate(input);
  };

  return (
    <div>
      <PageHeader
        titulo="Pedidos"
        descripcion="Tablero por estado: cada pedido avanza de Creado a Entregado siguiendo las transiciones válidas."
        acciones={
          <button
            className="primary"
            onClick={() => {
              setEditando(null);
              setMostrandoForm(true);
            }}
          >
            Nuevo pedido
          </button>
        }
      />

      {errorEstado && (
        <p role="alert" className={styles.errorEstado}>
          {errorEstado}
        </p>
      )}

      <Drawer
        open={mostrandoForm}
        onOpenChange={(open) => {
          if (!open) cerrarForm();
        }}
        title={editando ? 'Editar pedido' : 'Nuevo pedido'}
        ancho="min(600px, 100vw)"
      >
        <PedidoForm
          key={editando?.id ?? 'nuevo'}
          inicial={editando}
          productos={productos}
          colaciones={colaciones}
          clientes={clientes}
          onSubmit={handleSubmit}
          onVerificarDireccion={verificarDireccion}
          onCrearCliente={handleCrearCliente}
          onCancel={cerrarForm}
        />
      </Drawer>

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
