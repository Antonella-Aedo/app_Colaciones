import { useMemo, useState } from 'react';
import type { EstadoPedido, Pedido } from '../types';
import { esTerminal } from '../utils/pedidoEstado';
import { FILTROS_VACIOS, filtrarPedidos, hayFiltrosActivos } from '../utils/pedidoFiltros';
import { pesos } from '../utils/pedidoFormat';
import type { FiltrosPedido } from '../utils/pedidoFiltros';
import { PedidoFiltros } from './PedidoFiltros';
import { PedidoTablero } from './PedidoTablero';
import { PedidoTabla } from './PedidoTabla';
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

type Vista = 'tablero' | 'lista';

export function PedidoList({
  pedidos,
  loading,
  error,
  onEdit,
  onDelete,
  onChangeEstado,
  onConfirmarPago,
}: Props) {
  const [filtros, setFiltros] = useState<FiltrosPedido>(FILTROS_VACIOS);
  const [vista, setVista] = useState<Vista>('tablero');

  const pedidosFiltrados = useMemo(
    () => filtrarPedidos(pedidos, filtros),
    [pedidos, filtros],
  );

  const resumen = useMemo(() => {
    const activos = pedidosFiltrados.filter((p) => !esTerminal(p.estado));
    const porCobrar = pedidosFiltrados.filter(
      (p) => p.estadoPago === 'pendiente' && p.estado !== 'cancelado',
    );
    return {
      activos: activos.length,
      montoActivo: activos.reduce((acc, p) => acc + p.total, 0),
      porCobrar: porCobrar.length,
      montoPorCobrar: porCobrar.reduce((acc, p) => acc + p.total, 0),
    };
  }, [pedidosFiltrados]);

  if (loading) {
    return (
      <div className={styles.skeletonTablero} aria-busy="true" aria-label="Cargando pedidos">
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
      {/* Strip de métricas: hero (En curso) + soporte inline.
          Una sola barra, no 3 cards idénticas. El ojo viaja en F:
          hero → por cobrar → total. */}
      <div className={styles.strip}>
        <div className={styles.stripHero}>
          <span className={styles.stripLabel}>En curso</span>
          <span className={styles.stripHeroValor}>{resumen.activos}</span>
          <span className={styles.stripMeta}>{pesos(resumen.montoActivo)}</span>
        </div>
        <div className={styles.stripSecundaria} data-alerta={resumen.porCobrar > 0}>
          <span className={styles.stripLabel}>Por cobrar</span>
          <span className={styles.stripValor}>{resumen.porCobrar}</span>
          <span className={styles.stripMeta}>{pesos(resumen.montoPorCobrar)}</span>
        </div>
        <div className={styles.stripTerciaria}>
          <span className={styles.stripLabel}>Total</span>
          <span className={styles.stripValor}>{pedidosFiltrados.length}</span>
          <span className={styles.stripMeta}>
            {hayFiltrosActivos(filtros) ? `de ${pedidos.length}` : 'histórico'}
          </span>
        </div>
      </div>

      <PedidoFiltros
        filtros={filtros}
        onChange={setFiltros}
        total={pedidos.length}
        visibles={pedidosFiltrados.length}
        vista={vista}
        onVistaChange={setVista}
      />

      {vista === 'tablero' ? (
        <PedidoTablero
          pedidos={pedidosFiltrados}
          onEdit={onEdit}
          onDelete={onDelete}
          onChangeEstado={onChangeEstado}
          onConfirmarPago={onConfirmarPago}
        />
      ) : (
        <PedidoTabla
          pedidos={pedidosFiltrados}
          onEdit={onEdit}
          onDelete={onDelete}
          onChangeEstado={onChangeEstado}
          onConfirmarPago={onConfirmarPago}
        />
      )}
    </div>
  );
}
