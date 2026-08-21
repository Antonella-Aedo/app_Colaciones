import { useState } from 'react';
import { useProductos } from '../hooks/useProductos';
import { ProductoList } from '../components/ProductoList';
import { ProductoForm } from '../components/ProductoForm';
import type { Producto, ProductoInput } from '../types';

export function ProductosPage() {
  const { productos, loading, error, create, update, remove } = useProductos();
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const abrirNuevo = () => {
    setEditando(null);
    setMostrandoForm(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setMostrandoForm(true);
  };

  const cerrarForm = () => {
    setMostrandoForm(false);
    setEditando(null);
  };

  const handleSubmit = async (input: ProductoInput) => {
    if (editando) {
      await update(editando.id, input);
    } else {
      await create(input);
    }
    cerrarForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await remove(id);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Productos</h2>
        {!mostrandoForm && (
          <button className="primary" onClick={abrirNuevo}>Nuevo producto</button>
        )}
      </div>

      {mostrandoForm && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ProductoForm inicial={editando} onSubmit={handleSubmit} onCancel={cerrarForm} />
        </div>
      )}

      <ProductoList
        productos={productos}
        loading={loading}
        error={error}
        onEdit={abrirEditar}
        onDelete={handleDelete}
      />
    </div>
  );
}
