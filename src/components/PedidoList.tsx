import type { Pedido } from '../types';
import styles from './PedidoList.module.css';

interface Props {
  pedidos: Pedido[];
  loading: boolean;
  error: string | null;
}

export function PedidoList({ pedidos, loading, error }: Props) {
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
