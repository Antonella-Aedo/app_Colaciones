import { useMemo, useState } from 'react';
import { useColaciones } from '../hooks/useColaciones';
import { useProductos } from '../hooks/useProductos';
import { ColacionForm } from '../components/ColacionForm';
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

  const toggleActiva = async (c: Colacion) => {
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

      {loading && <p>Cargando colaciones…</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {!loading && !error && colaciones.length === 0 && !mostrandoForm && (
        <p>No hay colaciones registradas.</p>
      )}

      {colaciones.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {colaciones.map((c) => (
            <li
              key={c.id}
              style={{
                background: 'var(--color-surface)',
                padding: '1rem',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                borderLeft: c.activa ? '4px solid #16a34a' : '4px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong>{c.nombre}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  {c.fecha} · armado por {c.creadoPor || '—'}
                </span>
              </div>
              <ul style={{ margin: '0.6rem 0', paddingLeft: '1.2rem' }}>
                {c.items.map((it, i) => (
                  <li key={i}>
                    <em style={{ color: 'var(--color-muted)' }}>[{it.rol}]</em>{' '}
                    {productosMap.get(it.productoId) ?? it.productoId}
                    {it.nota && <em style={{ color: 'var(--color-muted)' }}> — {it.nota}</em>}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className={c.activa ? 'primary' : ''} onClick={() => toggleActiva(c)}>
                  {c.activa ? '★ Menú activo' : '☆ Activar como menú del día'}
                </button>
                <button onClick={() => editar(c)}>Editar</button>
                <button className="danger" onClick={() => eliminar(c.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
