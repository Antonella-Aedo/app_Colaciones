import type { Producto } from '../types';
import styles from './ProductoList.module.css';

interface Props {
  productos: Producto[];
  loading: boolean;
  error: string | null;
  onEdit: (producto: Producto) => void;
  onDelete: (id: string) => void;
}

export function ProductoList({ productos, loading, error, onEdit, onDelete }: Props) {
  if (loading) return <p className={styles.muted}>Cargando productos…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (productos.length === 0) return <p className={styles.muted}>No hay productos. Crea el primero.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Disponible</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => (
          <tr key={p.id}>
            <td>{p.nombre}</td>
            <td>{p.categoria || '—'}</td>
            <td>${p.precio.toLocaleString('es-CL')}</td>
            <td>{p.disponible ? 'Sí' : 'No'}</td>
            <td className={styles.actions}>
              <button onClick={() => onEdit(p)}>Editar</button>
              <button className="danger" onClick={() => onDelete(p.id)}>Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
