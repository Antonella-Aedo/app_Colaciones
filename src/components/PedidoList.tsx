import { useMemo, useState } from 'react';
import type { EstadoPedido, MetodoPago, Pedido } from '../types';
import {
  ESTADO_LABELS,
  ESTADOS_PEDIDO,
  esEditable,
  esEliminable,
  esTerminal,
  puedeTransicionar,
} from '../utils/pedidoEstado';
import styles from './PedidoList.module.css';

interface Props {
  pedidos: Pedido[];
  loading: boolean;
  error: string | null;
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

function formatFechaHora(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function pesos(monto: number): string {
  return `$${monto.toLocaleString('es-CL')}`;
}

interface Carril {
  estado: EstadoPedido;
  pedidos: Pedido[];
  monto: number;
}

export function PedidoList({
  pedidos,
  loading,
  error,
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

  const resumen = useMemo(() => {
    const activos = pedidos.filter((p) => !esTerminal(p.estado));
    const porCobrar = pedidos.filter(
      (p) => p.estadoPago === 'pendiente' && p.estado !== 'cancelado',
    );
    return {
      activos: activos.length,
      montoActivo: activos.reduce((acc, p) => acc + p.total, 0),
      porCobrar: porCobrar.length,
      montoPorCobrar: porCobrar.reduce((acc, p) => acc + p.total, 0),
    };
  }, [pedidos]);

  if (loading) {
    return (
      <div className={styles.tablero} aria-busy="true" aria-label="Cargando pedidos">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.skeletonCarril}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.estadoVacio} role="alert">
        <p className={styles.estadoTitulo}>No se pudieron cargar los pedidos</p>
        <p className={styles.estadoDetalle}>{error}</p>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className={styles.estadoVacio}>
        <p className={styles.estadoTitulo}>Todavía no hay pedidos</p>
        <p className={styles.estadoDetalle}>
          Al crear el primero aparecerá en el carril «Creado» y avanzará por el tablero.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.resumen}>
        <div className={styles.metrica}>
          <span className={styles.metricaLabel}>En curso</span>
          <span className={styles.metricaValor}>{resumen.activos}</span>
          <span className={styles.metricaMeta}>{pesos(resumen.montoActivo)}</span>
        </div>
        <div className={styles.metrica} data-alerta={resumen.porCobrar > 0}>
          <span className={styles.metricaLabel}>Por cobrar</span>
          <span className={styles.metricaValor}>{resumen.porCobrar}</span>
          <span className={styles.metricaMeta}>{pesos(resumen.montoPorCobrar)}</span>
        </div>
        <div className={styles.metrica}>
          <span className={styles.metricaLabel}>Total pedidos</span>
          <span className={styles.metricaValor}>{pedidos.length}</span>
          <span className={styles.metricaMeta}>histórico cargado</span>
        </div>
      </div>

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

                    <div className={styles.pago}>
                      <span className={styles.pagoBadge} data-pago={p.estadoPago}>
                        {p.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                      <span className={styles.pagoMetodo}>
                        {METODO_PAGO_LABELS[p.metodoPago]}
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
                      <button type="button" onClick={() => onEdit(p)} disabled={!editable}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => onDelete(p.id)}
                        disabled={!eliminable}
                      >
                        Eliminar
                      </button>
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
    </div>
  );
}
