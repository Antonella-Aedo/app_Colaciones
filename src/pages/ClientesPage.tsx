import { useState } from 'react';
import { useClientes } from '../hooks/useClientes';
import { ClienteList } from '../components/ClienteList';
import { ClienteForm } from '../components/ClienteForm';
import { PageHeader } from '../components/PageHeader';
import type { Cliente, ClienteInput } from '../types';

export function ClientesPage() {
  const { clientes, loading, error, create, update, remove } = useClientes();
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  const abrirNuevo = () => {
    setEditando(null);
    setMostrandoForm(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setMostrandoForm(true);
  };

  const cerrarForm = () => {
    setMostrandoForm(false);
    setEditando(null);
  };

  const handleSubmit = async (input: ClienteInput) => {
    if (editando) {
      await update(editando.id, input);
    } else {
      await create(input);
    }
    cerrarForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await remove(id);
  };

  return (
    <div>
      <PageHeader
        titulo="Clientes"
        descripcion="Direcciones y contactos que alimentan cada pedido."
        acciones={
          !mostrandoForm && (
            <button className="primary" onClick={abrirNuevo}>
              Nuevo cliente
            </button>
          )
        }
      />

      {mostrandoForm && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <ClienteForm inicial={editando} onSubmit={handleSubmit} onCancel={cerrarForm} />
        </div>
      )}

      <ClienteList
        clientes={clientes}
        loading={loading}
        error={error}
        onEdit={abrirEditar}
        onDelete={handleDelete}
      />
    </div>
  );
}
