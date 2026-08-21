import { useMemo, useState } from 'react';
import { useColaciones } from '../hooks/useColaciones';
import { useProductos } from '../hooks/useProductos';
import { ColacionForm } from '../components/ColacionForm';
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
    setEditando(null);
  };

  const editar = (c: Colacion) => {
    setEditando(c);
    setMostrandoForm(true);
  };

  const nuevo = () => {
    setEditando(null);
    setMostrandoForm(true);
  };

  const cancelar = () => {
    setMostrandoForm(false);
    setEditando(null);
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Colaciones / Menú del día</h2>
        {!mostrandoForm && (
          <button className="primary" onClick={nuevo}>Nueva colación</button>
        )}
      </div>

      {mostrandoForm && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ColacionForm
            productos={productos}
            inicial={editando}
            onSubmit={handleSubmit}
            onCancel={cancelar}
          />
        </div>
      )}

      {(!mostrandoForm || colaciones.length > 0 || loading || error) && (
        <ColacionList
          colaciones={colaciones}
          productosMap={productosMap}
          onEdit={editar}
          onDelete={eliminar}
          onActivar={toggleActiva}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
