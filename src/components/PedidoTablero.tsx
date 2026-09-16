import { useMemo, useState } from 'react';
import type { EstadoPedido, MetodoPago, Pedido } from '../types';
import {
  ESTADO_LABELS,
  ESTADOS_PEDIDO,
  esEditable,
  esEliminable,
  puedeTransicionar,
} from '../utils/pedidoEstado';
import { formatFechaHora, pesos } from '../utils/pedidoFormat';
import styles from './PedidoTablero.module.css';

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

const ITEMS_VISIBLES = 2;

interface Carril {
  estado: EstadoPedido;
  pedidos: Pedido[];
  monto: number;
}

export function PedidoTablero({
  pedidos,
  onEdit,
  onDelete,
  onChangeEstado,
  onConfirmarPago,
}: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggleItems = (id: string) => {
    setExpandidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const carriles = useMemo<Carril[]>(() => {
    const porEstado = new Map<EstadoPedido, Carril>(
      ESTADOS_PEDIDO.map((estado) => [estado, { estado, pedidos: [], monto: 0 }]),
    );
    for (const p of pedidos) {
      const carril = porEstado.get(p.estado);
      if (!carril) continue;
      carril.pedidos.push(p);
      carril.monto += p.total;
    }
    for (const carril of porEstado.values()) {
      carril.pedidos.sort((a, b) => b.fecha.localeCompare(a.fecha));
    }
    return ESTADOS_PEDIDO.map((estado) => porEstado.get(estado)!);
  }, [pedidos]);

  return (
    <div className={styles.tablero}>
      {carriles.map((carril) => (
        <section
          key={carril.estado}
          className={styles.carril}
          data-estado={carril.estado}
          data-vacio={carril.pedidos.length === 0}
          aria-label={`${ESTADO_LABELS[carril.estado]} — ${carril.pedidos.length} pedidos`}
        >
          <header className={styles.carrilHeader}>
            <span className={styles.carrilRiel} aria-hidden="true" />
            <h3 className={styles.carrilTitulo}>{ESTADO_LABELS[carril.estado]}</h3>
            <span className={styles.carrilConteo}>{carril.pedidos.length}</span>
            {carril.monto > 0 && (
              <span className={styles.carrilMonto}>{pesos(carril.monto)}</span>
            )}
          </header>

          <div className={styles.pila}>
            {carril.pedidos.length === 0 && (
              <p className={styles.carrilVacio}>Sin pedidos</p>
            )}

            {carril.pedidos.map((p) => {
              const editable = esEditable(p.estado);
              const eliminable = esEliminable(p.estado);
              const expandido = expandidos.has(p.id);
              const visibles = expandido ? p.items : p.items.slice(0, ITEMS_VISIBLES);
              const ocultos = p.items.length - visibles.length;
              const opcionesEstado = ESTADOS_PEDIDO.filter(
                (est) => est === p.estado || puedeTransicionar(p.estado, est),
              );

              return (
                <article key={p.id} className={styles.card} data-estado={p.estado}>
                  {/* Focal: cliente domina. Total se demuestra a la derecha
                      pero no compite — menor tamaño y peso. */}
                  <div className={styles.cardTop}>
                    <div className={styles.clienteBloque}>
                      <span className={styles.cliente}>
                        {p.clienteNombre || p.clienteDireccion || 'Sin cliente'}
                      </span>
                      <span className={styles.meta}>
                        {p.fecha}
                        {' · '}
                        {p.tipoEntrega === 'delivery' ? 'Delivery PH' : 'Retiro'}
                        {p.colacionId ? ' · colación' : ''}
                      </span>
                    </div>
                    <span className={styles.total}>{pesos(p.total)}</span>
                  </div>

                  {/* Ítems ligeros: sin fondo hundido, solo texto sutil.
                      Expandible bajo demanda para no saturar la card. */}
                  {p.items.length > 0 && (
                    <ul className={styles.items}>
                      {visibles.map((it, i) => (
                        <li key={i} className={styles.item}>
                          <span className={styles.itemCantidad}>{it.cantidad}×</span>
                          <span className={styles.itemNombre}>
                            {it.nombre}
                            {(it.agregado || it.ensalada || it.notas) && (
                              <span className={styles.itemDetalle}>
                                {it.agregado && ` · agregado: ${it.agregado}`}
                                {it.ensalada && ` · ensalada: ${it.ensalada}`}
                                {it.notas && ` · ${it.notas}`}
                              </span>
                            )}
                          </span>
                          <span className={styles.itemRol}>{it.rol}</span>
                        </li>
                      ))}
                      {ocultos > 0 && (
                        <li>
                          <button
                            type="button"
                            className={styles.verMas}
                            onClick={() => toggleItems(p.id)}
                          >
                            +{ocultos} ítem{ocultos > 1 ? 's' : ''} más
                          </button>
                        </li>
                      )}
                      {expandido && p.items.length > ITEMS_VISIBLES && (
                        <li>
                          <button
                            type="button"
                            className={styles.verMas}
                            onClick={() => toggleItems(p.id)}
                          >
                            Ver menos
                          </button>
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Pago: estado de pago (badge) + método (etiquetado) + acción */}
                  <div className={styles.pago}>
                    <span className={styles.pagoBadge} data-pago={p.estadoPago}>
                      {p.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </span>
                    <span className={styles.pagoMetodo}>
                      Método: {METODO_PAGO_LABELS[p.metodoPago]}
                    </span>
                    {p.estadoPago === 'pendiente' && (
                      <button
                        type="button"
                        className={styles.confirmarPago}
                        onClick={() => onConfirmarPago(p.id)}
                      >
                        Confirmar pago
                      </button>
                    )}
                  </div>

                  {/* Acciones jerárquicas: estado como acción primaria
                      (ancho completo), editar/eliminar como secundarias. */}
                  <div className={styles.acciones}>
                    <select
                      className={styles.estadoSelect}
                      value={p.estado}
                      onChange={(e) => onChangeEstado(p.id, e.target.value as EstadoPedido)}
                      aria-label={`Cambiar estado del pedido de ${p.clienteNombre || p.clienteDireccion || 'cliente sin nombre'}`}
                      disabled={opcionesEstado.length <= 1}
                    >
                      {opcionesEstado.map((est) => (
                        <option key={est} value={est}>
                          {ESTADO_LABELS[est]}
                        </option>
                      ))}
                    </select>
                    <div className={styles.accionesSecundarias}>
                      <button
                        type="button"
                        className={styles.botonSecundario}
                        onClick={() => onEdit(p)}
                        disabled={!editable}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.botonSecundario}
                        data-accion="danger"
                        onClick={() => onDelete(p.id)}
                        disabled={!eliminable}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {(p.estadoActualizadoPor || p.estadoActualizadoEn) && (
                    <p className={styles.auditoria}>
                      {p.estadoActualizadoPor}
                      {p.estadoActualizadoPor && p.estadoActualizadoEn && ' · '}
                      {p.estadoActualizadoEn && formatFechaHora(p.estadoActualizadoEn)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
