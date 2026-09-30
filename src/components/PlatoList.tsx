import { useEffect, useRef, useState } from 'react';
import type { Plato, PlatoItem, RolItem, TipoPlato } from '../types';
import { fotoDeMenu } from '../assets/menuFotos';
import styles from './PlatoList.module.css';

const ROLES: RolItem[] = ['fondo', 'agregado', 'ensalada', 'extra'];

const ROL_LABEL: Record<RolItem, string> = {
  fondo: 'Fondo',
  agregado: 'Agregado',
  ensalada: 'Ensalada',
  extra: 'Extra',
};

const TIPO_LABEL: Record<TipoPlato, string> = {
  menu: 'Menú',
  colacion: 'Colación',
};

/** Ítems que muestra la card antes de recortar a "+N más". */
const MAX_VISIBLES = 4;
/** Debe calzar con la animación modalOut del CSS. */
const CIERRE_MS = 150;

const fechaDate = (iso: string) => new Date(`${iso}T12:00:00`);

const diaSemana = (iso: string) =>
  fechaDate(iso).toLocaleDateString('es-CL', { weekday: 'long' });

const fechaCorta = (iso: string) =>
  fechaDate(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

const fechaLarga = (iso: string) =>
  fechaDate(iso).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

const fmtValor = (valor?: number) =>
  valor === undefined ? null : `$${valor.toLocaleString('es-CL')}`;

/** Fondo primero, luego agregado/ensalada/extra; dentro del rol, por `orden`. */
const itemsOrdenados = (p: Plato) =>
  [...p.items].sort(
    (a, b) => ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || a.orden - b.orden,
  );

interface Props {
  platos: Plato[];
  productosMap: Map<string, string>;
  onEdit: (plato: Plato) => void;
  onDelete: (id: string) => void;
  onToggleActiva: (plato: Plato) => void;
  loading?: boolean;
  error?: string | null;
}

interface CardProps extends Omit<Props, 'platos' | 'loading' | 'error'> {
  p: Plato;
  onVer: (id: string) => void;
}

function ItemNombre({
  it,
  productosMap,
}: {
  it: PlatoItem;
  productosMap: Map<string, string>;
}) {
  return (
    <span className={styles.itemNombre}>
      {productosMap.get(it.productoId) ?? it.productoId}
      {it.nota && <span className={styles.itemNota}> · {it.nota}</span>}
    </span>
  );
}

function Ojo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CardPoster({ p, productosMap, onVer, onEdit, onDelete, onToggleActiva }: CardProps) {
  const ordenados = itemsOrdenados(p);
  const visibles = ordenados.slice(0, MAX_VISIBLES);
  const ocultos = ordenados.length - visibles.length;
  const foto = fotoDeMenu(p.foto);
  const esMenu = p.tipo === 'menu';
  const valor = fmtValor(p.valor);

  return (
    <article className={styles.card} data-activa={p.activa} onClick={() => onVer(p.id)}>
      <button
        type="button"
        className={styles.ojo}
        aria-label="Ver plato completo"
        onClick={(e) => {
          e.stopPropagation();
          onVer(p.id);
        }}
      >
        <Ojo />
      </button>

      {foto && (
        <img className={styles.foto} src={foto} alt="" aria-hidden="true" loading="lazy" />
      )}

      <div className={styles.encabezado}>
        <span className={styles.eyebrow}>
          {esMenu ? p.nombre : `Colación${valor ? ` · ${valor}` : ''}`}
        </span>
        {p.activa && <span className={styles.badge}>Disponible hoy</span>}
      </div>
      <div className={styles.dia}>{esMenu && p.fecha ? diaSemana(p.fecha) : p.nombre}</div>
      <span className={styles.fecha}>
        {esMenu && p.fecha
          ? `${fechaCorta(p.fecha)} · ${p.creadoPor}`
          : `Valor fijo · ${p.creadoPor}`}
      </span>

      <ul className={styles.items}>
        {visibles.map((it, i) => (
          <li key={i} className={styles.item} data-rol={it.rol}>
            <ItemNombre it={it} productosMap={productosMap} />
            <span className={styles.itemRol}>{ROL_LABEL[it.rol]}</span>
          </li>
        ))}
        {ocultos > 0 && (
          <li className={styles.mas}>+{ocultos} más — ver plato completo</li>
        )}
      </ul>

      <footer className={styles.acciones} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={p.activa ? 'primary' : ''}
          onClick={() => onToggleActiva(p)}
        >
          {p.activa ? '★ Disponible hoy' : '☆ Disponible'}
        </button>
        <button type="button" onClick={() => onEdit(p)}>
          Editar
        </button>
        <button type="button" className="danger" onClick={() => onDelete(p.id)}>
          Eliminar
        </button>
      </footer>
    </article>
  );
}

interface DetalleProps extends Omit<CardProps, 'onVer'> {
  cerrando: boolean;
  onCerrar: () => void;
}

function DetallePlato({
  p,
  productosMap,
  cerrando,
  onCerrar,
  onEdit,
  onDelete,
  onToggleActiva,
}: DetalleProps) {
  // Escape cierra + bloquea el scroll del fondo mientras el detalle está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onCerrar]);

  const accion = (fn: () => void) => () => {
    fn();
    onCerrar();
  };

  const foto = fotoDeMenu(p.foto);
  const esMenu = p.tipo === 'menu';
  const valor = fmtValor(p.valor);

  return (
    <div
      className={styles.overlay}
      data-cerrando={cerrando}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className={`${styles.modal} ${foto ? styles.modalConFoto : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plato-detalle-titulo"
      >
        {foto && (
          <img className={styles.modalFoto} src={foto} alt="" aria-hidden="true" />
        )}
        <button
          type="button"
          className={styles.cerrar}
          aria-label="Cerrar"
          autoFocus
          onClick={onCerrar}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M4 4l8 8M12 4l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <span className={styles.eyebrow}>
          {TIPO_LABEL[p.tipo]}
          {p.activa ? ' · disponible hoy' : ''}
        </span>
        <h2 id="plato-detalle-titulo" className={styles.modalTitulo}>
          {p.nombre}
        </h2>
        <p className={styles.modalMeta}>
          {[
            esMenu && p.fecha ? fechaLarga(p.fecha) : null,
            valor ? `Valor fijo ${valor}` : null,
            p.creadoPor,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        <div className={styles.grupos}>
          {ROLES.map((rol) => {
            const items = p.items
              .filter((i) => i.rol === rol)
              .sort((a, b) => a.orden - b.orden);
            if (items.length === 0) return null;
            return (
              <section key={rol} className={styles.grupo} data-rol={rol}>
                <h3 className={styles.grupoTitulo}>
                  <span className={styles.grupoDot} aria-hidden="true" />
                  {ROL_LABEL[rol]}
                </h3>
                <ul className={styles.grupoItems}>
                  {items.map((it, i) => (
                    <li key={i}>
                      <ItemNombre it={it} productosMap={productosMap} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className={styles.modalFoot}>
          <button
            type="button"
            className={p.activa ? 'primary' : ''}
            onClick={accion(() => onToggleActiva(p))}
          >
            {p.activa ? '★ Disponible hoy' : '☆ Disponible'}
          </button>
          <button type="button" onClick={accion(() => onEdit(p))}>
            Editar
          </button>
          <button
            type="button"
            className="danger"
            onClick={accion(() => onDelete(p.id))}
          >
            Eliminar
          </button>
        </footer>
      </div>
    </div>
  );
}

export function PlatoList({
  platos,
  productosMap,
  onEdit,
  onDelete,
  onToggleActiva,
  loading,
  error,
}: Props) {
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  // Si la lista se desmonta a media animación de cierre, el timer no debe
  // disparar setState sobre un componente muerto.
  const timerCierre = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timerCierre.current), []);

  if (loading) return <p className={styles.muted}>Cargando platos…</p>;
  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (platos.length === 0)
    return <p className={styles.muted}>No hay platos registrados.</p>;

  const detalle = platos.find((p) => p.id === detalleId) ?? null;

  const cerrarDetalle = () => {
    window.clearTimeout(timerCierre.current);
    setCerrando(true);
    timerCierre.current = window.setTimeout(() => {
      setDetalleId(null);
      setCerrando(false);
    }, CIERRE_MS);
  };

  // Abrir otra card mientras un detalle está cerrando: cancela el cierre
  // pendiente para que el modal muestre el nuevo plato, no la animación.
  const verDetalle = (id: string) => {
    window.clearTimeout(timerCierre.current);
    setCerrando(false);
    setDetalleId(id);
  };

  // Los disponibles primero; el resto conserva el orden de la capa de datos.
  const ordenados = [...platos].sort(
    (a, b) => Number(b.activa) - Number(a.activa),
  );

  return (
    <>
      <div className={styles.grid}>
        {ordenados.map((p) => (
          <CardPoster
            key={p.id}
            p={p}
            productosMap={productosMap}
            onVer={verDetalle}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActiva={onToggleActiva}
          />
        ))}
      </div>

      {detalle && (
        <DetallePlato
          p={detalle}
          productosMap={productosMap}
          cerrando={cerrando}
          onCerrar={cerrarDetalle}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActiva={onToggleActiva}
        />
      )}
    </>
  );
}
