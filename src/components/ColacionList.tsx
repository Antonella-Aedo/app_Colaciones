import type { Colacion } from '../types';
import styles from './ColacionList.module.css';

interface Props {
  colaciones: Colacion[];
  productosMap: Map<string, string>;
  onEdit: (colacion: Colacion) => void;
  onDelete: (id: string) => void;
  onActivar: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function ColacionList({
  colaciones,
  productosMap,
  onEdit,
  onDelete,
  onActivar,
  loading,
  error,
}: Props) {
  if (loading) return <p className={styles.muted}>Cargando colaciones…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (colaciones.length === 0)
    return <p className={styles.muted}>No hay colaciones registradas.</p>;

  return (
    <ul className={styles.list}>
      {colaciones.map((c) => (
        <li key={c.id} className={styles.item} data-activa={c.activa}>
          <div className={styles.header}>
            <strong className={styles.name}>{c.nombre}</strong>
            {c.activa && <span className={styles.badge}>Activa</span>}
            <span className={styles.meta}>
              {c.fecha} · armado por {c.creadoPor || '—'}
            </span>
          </div>

          <ul className={styles.items}>
            {c.items.map((it, i) => (
              <li key={i}>
                <em className={styles.rol}>[{it.rol}]</em>{' '}
                {productosMap.get(it.productoId) ?? it.productoId}
                {it.nota && <em className={styles.nota}> — {it.nota}</em>}
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <button
              className={c.activa ? 'primary' : ''}
              onClick={() => onActivar(c.id)}
            >
              {c.activa ? '★ Menú activo' : '☆ Activar como menú del día'}
            </button>
            <button onClick={() => onEdit(c)}>Editar</button>
            <button className="danger" onClick={() => onDelete(c.id)}>
              Eliminar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
