import type { Cliente } from '../types';
import styles from './ClienteList.module.css';

interface Props {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export function ClienteList({ clientes, loading, error, onEdit, onDelete }: Props) {
  if (loading) return <p className={styles.muted}>Cargando clientes…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (clientes.length === 0) return <p className={styles.muted}>No hay clientes. Crea el primero.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Dirección</th>
          <th>Contacto</th>
          <th>Nombre</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr key={c.id}>
            <td>{c.direccion}</td>
            <td>{c.contacto}</td>
            <td>{c.nombre || '—'}</td>
            <td className={styles.actions}>
              <button onClick={() => onEdit(c)}>Editar</button>
              <button className="danger" onClick={() => onDelete(c.id)}>Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
