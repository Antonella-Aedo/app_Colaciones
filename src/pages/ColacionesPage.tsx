import { useMemo, useState } from 'react';
import { useColaciones } from '../hooks/useColaciones';
import { useProductos } from '../hooks/useProductos';
import { ColacionForm } from '../components/ColacionForm';
import { PageHeader } from '../components/PageHeader';
import { Drawer } from '../components/Drawer';
import { ColacionList } from '../components/ColacionList';
import type { Colacion, ColacionInput } from '../types';

export function ColacionesPage() {
  const { colaciones, loading, error, create, update, remove, activar } = useColaciones();
  const { productos } = useProductos();
  const [editando, setEditando] = useState<Colacion | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);

  const productosMap = useMemo(() => {
    const m = new Map<string, string>();
    productos.forEach((p) => m.set(p.id, p.nombre));
    return m;
  }, [productos]);

  const handleSubmit = async (input: ColacionInput) => {
    if (editando) {
      await update(editando.id, input);
    } else {
      await create(input);
    }
    setMostrandoForm(false);
  };

  const editar = (c: Colacion) => {
    setEditando(c);
    setMostrandoForm(true);
  };

  const nuevo = () => {
    setEditando(null);
    setMostrandoForm(true);
  };

  // No se limpia `editando` al cerrar: Vaul mantiene el contenido montado
  // durante la animación de salida y el formulario parpadearía a vacío. Cada
  // camino de apertura fija `editando` explícitamente.
  const cancelar = () => setMostrandoForm(false);

  const eliminar = async (id: string) => {
    if (confirm('¿Eliminar esta colación?')) {
      await remove(id);
    }
  };

  const toggleActiva = async (id: string) => {
    const c = colaciones.find((x) => x.id === id);
    if (!c) return;
    if (c.activa) {
      // desactivar
      await update(c.id, { ...c, activa: false });
    } else {
      await activar(c.id);
    }
  };

  return (
    <div>
      <PageHeader
        titulo="Colaciones"
        descripcion="El menú del día: fondo, agregado y ensalada armados como una bandeja. Solo una colación puede estar activa a la vez."
        acciones={
          <button className="primary" onClick={nuevo}>
            Nueva colación
          </button>
        }
      />

      <Drawer
        open={mostrandoForm}
        onOpenChange={(open) => {
          if (!open) cancelar();
        }}
        title={editando ? 'Editar colación' : 'Nueva colación'}
      >
        <ColacionForm
          productos={productos}
          inicial={editando}
          onSubmit={handleSubmit}
          onCancel={cancelar}
        />
      </Drawer>

      <ColacionList
        colaciones={colaciones}
        productosMap={productosMap}
        onEdit={editar}
        onDelete={eliminar}
        onActivar={toggleActiva}
        loading={loading}
        error={error}
      />
    </div>
  );
}
