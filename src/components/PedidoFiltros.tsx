import type { EstadoPago, TipoEntrega } from '../types';
import { ESTADO_LABELS, ESTADOS_PEDIDO } from '../utils/pedidoEstado';
import type { FiltrosPedido } from '../utils/pedidoFiltros';
import styles from './PedidoFiltros.module.css';

interface Props {
  filtros: FiltrosPedido;
  onChange: (filtros: FiltrosPedido) => void;
  total: number;
  visibles: number;
  vista: 'tablero' | 'lista';
  onVistaChange: (vista: 'tablero' | 'lista') => void;
}

const TIPOS_ENTREGA: { valor: TipoEntrega; label: string }[] = [
  { valor: 'delivery', label: 'Delivery' },
  { valor: 'retiro', label: 'Retiro' },
];

const ESTADOS_PAGO: { valor: EstadoPago; label: string }[] = [
  { valor: 'pendiente', label: 'Pendiente' },
  { valor: 'pagado', label: 'Pagado' },
];

function toggle<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

function hoyISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function PedidoFiltros({
  filtros,
  onChange,
  total,
  visibles,
  vista,
  onVistaChange,
}: Props) {
  const set = (patch: Partial<FiltrosPedido>) => onChange({ ...filtros, ...patch });
  const limpiar = () =>
    onChange({
      fechaDesde: null,
      fechaHasta: null,
      estados: [],
      cliente: '',
      tiposEntrega: [],
      estadosPago: [],
    });

  return (
    <div className={styles.barra}>
      {/* Fila 1: inputs principales (fecha + cliente) — mayor valor de filtrado */}
      <div className={styles.filaPrincipal}>
        <div className={styles.grupoFecha}>
          <span className={styles.grupoLabel}>Fecha</span>
          <div className={styles.fechaInputs}>
            <input
              type="date"
              value={filtros.fechaDesde ?? ''}
              onChange={(e) => set({ fechaDesde: e.target.value || null })}
              aria-label="Desde"
            />
            <span className={styles.fechaSep} aria-hidden="true">→</span>
            <input
              type="date"
              value={filtros.fechaHasta ?? ''}
              onChange={(e) => set({ fechaHasta: e.target.value || null })}
              aria-label="Hasta"
            />
            <button
              type="button"
              className={styles.chipAccion}
              onClick={() => set({ fechaDesde: hoyISO(), fechaHasta: hoyISO() })}
            >
              Hoy
            </button>
          </div>
        </div>

        <div className={styles.grupoCliente}>
          <span className={styles.grupoLabel}>Cliente</span>
          <input
            type="search"
            value={filtros.cliente}
            onChange={(e) => set({ cliente: e.target.value })}
            placeholder="Nombre o dirección"
            aria-label="Buscar por cliente"
          />
        </div>
      </div>

      {/* Fila 2: chips secundarios (estado + entrega + pago) + toggle + conteo */}
      <div className={styles.filaSecundaria}>
        <div className={styles.grupoChips}>
          <span className={styles.grupoLabel}>Estado</span>
          <div className={styles.chips}>
            {ESTADOS_PEDIDO.map((est) => (
              <button
                key={est}
                type="button"
                className={styles.chip}
                data-estado={est}
                data-activo={filtros.estados.includes(est)}
                aria-pressed={filtros.estados.includes(est)}
                onClick={() => set({ estados: toggle(filtros.estados, est) })}
              >
                {ESTADO_LABELS[est]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grupoChips}>
          <span className={styles.grupoLabel}>Entrega</span>
          <div className={styles.chips}>
            {TIPOS_ENTREGA.map((t) => (
              <button
                key={t.valor}
                type="button"
                className={styles.chip}
                data-activo={filtros.tiposEntrega.includes(t.valor)}
                aria-pressed={filtros.tiposEntrega.includes(t.valor)}
                onClick={() => set({ tiposEntrega: toggle(filtros.tiposEntrega, t.valor) })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grupoChips}>
          <span className={styles.grupoLabel}>Pago</span>
          <div className={styles.chips}>
            {ESTADOS_PAGO.map((e) => (
              <button
                key={e.valor}
                type="button"
                className={styles.chip}
                data-pago={e.valor}
                data-activo={filtros.estadosPago.includes(e.valor)}
                aria-pressed={filtros.estadosPago.includes(e.valor)}
                onClick={() => set({ estadosPago: toggle(filtros.estadosPago, e.valor) })}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lado derecho: toggle de vista + conteo + limpiar — todo unificado */}
        <div className={styles.lado}>
          <div className={styles.toggle} role="group" aria-label="Vista de pedidos">
            <button
              type="button"
              className={styles.toggleBtn}
              data-activo={vista === 'tablero'}
              aria-pressed={vista === 'tablero'}
              onClick={() => onVistaChange('tablero')}
            >
              Tablero
            </button>
            <button
              type="button"
              className={styles.toggleBtn}
              data-activo={vista === 'lista'}
              aria-pressed={vista === 'lista'}
              onClick={() => onVistaChange('lista')}
            >
              Lista
            </button>
          </div>
          <span className={styles.conteo}>
            {visibles} de {total}
          </span>
          <button type="button" className={styles.limpiar} onClick={limpiar}>
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
