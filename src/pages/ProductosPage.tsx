import { useState } from 'react';
import { useProductos } from '../hooks/useProductos';
import { ProductoList } from '../components/ProductoList';
import { ProductoForm } from '../components/ProductoForm';
import { PageHeader } from '../components/PageHeader';
import { Drawer } from '../components/Drawer';
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

  // No se limpia `editando` al cerrar: Vaul mantiene el contenido montado
  // durante la animación de salida y el formulario parpadearía a vacío. Cada
  // camino de apertura fija `editando` explícitamente, así que el valor
  // obsoleto solo vive mientras el panel se desliza hacia afuera.
  const cerrarForm = () => setMostrandoForm(false);

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
          <button className="primary" onClick={abrirNuevo}>
            Nuevo producto
          </button>
        }
      />

      <Drawer
        open={mostrandoForm}
        onOpenChange={(open) => {
          if (!open) cerrarForm();
        }}
        title={editando ? 'Editar producto' : 'Nuevo producto'}
      >
        <ProductoForm inicial={editando} onSubmit={handleSubmit} onCancel={cerrarForm} />
      </Drawer>

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
