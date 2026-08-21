import { useState } from 'react';
import { useProductos } from '../hooks/useProductos';
import { ProductoList } from '../components/ProductoList';
import { ProductoForm } from '../components/ProductoForm';
import { PageHeader } from '../components/PageHeader';
import type { Producto, ProductoInput } from '../types';
import styles from './ProductosPage.module.css';

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
      <PageHeader
        titulo="Productos"
        descripcion="El catálogo, agrupado por categoría. Cada color viene del alimento: tomate, lechuga, choclo, betarraga, palta, agua."
        acciones={
          !mostrandoForm && (
            <button className="primary" onClick={abrirNuevo}>
              Nuevo producto
            </button>
          )
        }
      />

      {mostrandoForm && (
        <div className={styles.formWrapper}>
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
