import type { EstadoPedido, Pedido } from '../types';
import styles from './PedidoList.module.css';

interface Props {
  pedidos: Pedido[];
  loading: boolean;
  error: string | null;
  onEdit: (p: Pedido) => void;
  onDelete: (id: string) => void;
  onChangeEstado: (id: string, estado: EstadoPedido) => void;
}

const ESTADOS: EstadoPedido[] = ['pendiente', 'entregado', 'cancelado'];

export function PedidoList({ pedidos, loading, error, onEdit, onDelete, onChangeEstado }: Props) {
  if (loading) return <p className={styles.muted}>Cargando pedidos…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (pedidos.length === 0) return <p className={styles.muted}>No hay pedidos. Crea el primero.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Registrado por</th>
          <th>Origen</th>
          <th>Items</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {pedidos.map((p) => (
          <tr key={p.id}>
            <td>{p.fecha}</td>
            <td>{p.cliente}</td>
            <td>{p.registradoPor || '—'}</td>
            <td>{p.colacionId ? 'colación' : 'manual'}</td>
            <td className={styles.items}>
              {p.items.map((it, i) => (
                <div key={i}>
                  <em style={{ color: 'var(--color-muted)', fontSize: '0.78rem' }}>[{it.rol}]</em>{' '}
                  {it.cantidad}× {it.nombre}
                  {(it.agregado || it.ensalada || it.notas) && (
                    <small className={styles.detalle}>
                      {it.agregado && <> · agregado: {it.agregado}</>}
                      {it.ensalada && <> · ensalada: {it.ensalada}</>}
                      {it.notas && <> · {it.notas}</>}
                    </small>
                  )}
                </div>
              ))}
            </td>
            <td>${p.total.toLocaleString('es-CL')}</td>
            <td>
              <span className={styles.estado} data-estado={p.estado}>
                {p.estado}
              </span>
            </td>
            <td className={styles.actions}>
              <select
                className={styles.estadoSelect}
                value={p.estado}
                onChange={(e) => onChangeEstado(p.id, e.target.value as EstadoPedido)}
                aria-label="Cambiar estado del pedido"
              >
                {ESTADOS.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
              <button onClick={() => onEdit(p)}>Editar</button>
              <button className="danger" onClick={() => onDelete(p.id)}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
