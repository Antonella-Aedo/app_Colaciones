import type { EstadoPedido, MetodoPago, Pedido } from '../types';
import {
  ESTADO_LABELS,
  ESTADOS_PEDIDO,
  esEditable,
  esEliminable,
  esTerminal,
  puedeTransicionar,
} from '../utils/pedidoEstado';
import { formatFecha, pesos } from '../utils/pedidoFormat';
import styles from './PedidoTabla.module.css';

interface Props {
  pedidos: Pedido[];
  onEdit: (p: Pedido) => void;
  onDelete: (id: string) => void;
  onChangeEstado: (id: string, estado: EstadoPedido) => void;
  onConfirmarPago: (id: string) => void;
}

const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

export function PedidoTabla({
  pedidos,
  onEdit,
  onDelete,
  onChangeEstado,
  onConfirmarPago,
}: Props) {
  if (pedidos.length === 0) {
    return (
      <div className={styles.vacio}>
        <p className={styles.vacioTitulo}>Sin pedidos para los filtros actuales</p>
        <p className={styles.vacioDetalle}>Ajusta o limpia los filtros para ver resultados.</p>
      </div>
    );
  }

  const ordenados = [...pedidos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className={styles.contenedor}>
      <table>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Cliente</th>
            <th scope="col">Estado</th>
            <th scope="col">Detalles</th>
            <th scope="col" className={styles.num}>Total</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((p) => {
            const editable = esEditable(p.estado);
            const eliminable = esEliminable(p.estado);
            const opcionesEstado = ESTADOS_PEDIDO.filter(
              (est) => est === p.estado || puedeTransicionar(p.estado, est),
            );
            return (
              <tr key={p.id}>
                <td className={styles.fecha}>{formatFecha(p.fecha)}</td>
                <td className={styles.cliente}>
                  <span className={styles.clienteNombre}>
                    {p.clienteNombre || p.clienteDireccion || 'Sin cliente'}
                  </span>
                  {p.clienteNombre && (
                    <span className={styles.clienteDir}>{p.clienteDireccion}</span>
                  )}
                </td>
                <td>
                  <span className={styles.estadoBadge} data-estado={p.estado}>
                    <span className={styles.estadoRiel} aria-hidden="true" />
                    {ESTADO_LABELS[p.estado]}
                  </span>
                </td>
                {/* Detalles: entrega + pago + método consolidados en una celda
                    con badges inline. Antes eran 3 columnas separadas. */}
                <td>
                  <div className={styles.detalles}>
                    <span className={styles.detalleChip} data-tipo="entrega">
                      {p.tipoEntrega === 'delivery' ? 'Delivery' : 'Retiro'}
                    </span>
                    <span className={styles.detalleChip} data-pago={p.estadoPago}>
                      {p.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </span>
                    <span className={styles.detalleChip} data-tipo="metodo">
                      {METODO_PAGO_LABELS[p.metodoPago]}
                    </span>
                    {/* El método es el medio de pago, no el estado de pago.
                        El chip de pago (verde/amarillo) ya indica el estado. */}
                  </div>
                </td>
                <td className={styles.num}>{pesos(p.total)}</td>
                <td>
                  <div className={styles.acciones}>
                    {p.estadoPago === 'pendiente' && p.estado !== 'cancelado' && (
                      <button
                        type="button"
                        className={styles.accionChica}
                        data-accion="pago"
                        onClick={() => onConfirmarPago(p.id)}
                      >
                        Pago
                      </button>
                    )}
                    <select
                      className={styles.estadoSelect}
                      value={p.estado}
                      onChange={(e) => onChangeEstado(p.id, e.target.value as EstadoPedido)}
                      aria-label={`Estado del pedido de ${p.clienteNombre || p.clienteDireccion || 'cliente'}`}
                      disabled={esTerminal(p.estado)}
                    >
                      {opcionesEstado.map((est) => (
                        <option key={est} value={est}>
                          {ESTADO_LABELS[est]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.accionChica}
                      onClick={() => onEdit(p)}
                      disabled={!editable}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.accionChica}
                      data-accion="danger"
                      onClick={() => onDelete(p.id)}
                      disabled={!eliminable}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
