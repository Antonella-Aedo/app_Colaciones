import { useMemo, useState } from 'react';
import type { Producto } from '../types';
import {
  CATEGORIAS,
  CATEGORIA_OTRO,
  type CategoriaMeta,
  ordenCategoria,
  resolverCategoria,
} from '../constants/categorias';
import styles from './ProductoList.module.css';

interface Props {
  productos: Producto[];
  loading: boolean;
  error: string | null;
  onEdit: (producto: Producto) => void;
  onDelete: (id: string) => void;
}

interface Grupo {
  meta: CategoriaMeta;
  productos: Producto[];
}

function agrupar(productos: Producto[]): Grupo[] {
  const porKey = new Map<string, Grupo>();

  for (const p of productos) {
    const meta = resolverCategoria(p.categoria);
    let grupo = porKey.get(meta.key);
    if (!grupo) {
      grupo = { meta, productos: [] };
      porKey.set(meta.key, grupo);
    }
    grupo.productos.push(p);
  }

  for (const grupo of porKey.values()) {
    grupo.productos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  return [...porKey.values()].sort(
    (a, b) => ordenCategoria(a.meta.key) - ordenCategoria(b.meta.key),
  );
}

export function ProductoList({ productos, loading, error, onEdit, onDelete }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  // Conteos sobre el set completo: los filtros no deben esconder cuánto hay.
  const conteos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of productos) {
      const key = resolverCategoria(p.categoria).key;
      mapa.set(key, (mapa.get(key) ?? 0) + 1);
    }
    return mapa;
  }, [productos]);

  const categoriasPresentes = useMemo(
    () => [...CATEGORIAS, CATEGORIA_OTRO].filter((c) => conteos.has(c.key)),
    [conteos],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (soloDisponibles && !p.disponible) return false;
      if (categoriaActiva && resolverCategoria(p.categoria).key !== categoriaActiva) return false;
      if (!q) return true;
      // Solo por nombre: la descripción ya no se muestra en la card, y una
      // coincidencia invisible se lee como un resultado sin razón.
      return p.nombre.toLowerCase().includes(q);
    });
  }, [productos, busqueda, categoriaActiva, soloDisponibles]);

  const grupos = useMemo(() => agrupar(filtrados), [filtrados]);

  const hayFiltros = Boolean(busqueda.trim()) || categoriaActiva !== null || soloDisponibles;

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaActiva(null);
    setSoloDisponibles(false);
  };

  if (loading) {
    return (
      <div className={styles.skeletonGrid} aria-busy="true" aria-label="Cargando productos">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.estadoVacio} role="alert">
        <p className={styles.estadoTitulo}>No se pudieron cargar los productos</p>
        <p className={styles.estadoDetalle}>{error}</p>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className={styles.estadoVacio}>
        <p className={styles.estadoTitulo}>Todavía no hay productos</p>
        <p className={styles.estadoDetalle}>
          Crea el primero y aparecerá agrupado por su categoría.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.buscador}>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            aria-label="Buscar producto por nombre"
          />
        </div>

        <div className={styles.chips} role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={styles.chip}
            data-activo={categoriaActiva === null}
            onClick={() => setCategoriaActiva(null)}
          >
            Todas
            <span className={styles.chipConteo}>{productos.length}</span>
          </button>
          {categoriasPresentes.map((c) => (
            <button
              key={c.key}
              type="button"
              className={styles.chip}
              data-cat={c.token}
              data-activo={categoriaActiva === c.key}
              onClick={() => setCategoriaActiva(categoriaActiva === c.key ? null : c.key)}
            >
              <span className={styles.chipPunto} aria-hidden="true" />
              {c.label}
              <span className={styles.chipConteo}>{conteos.get(c.key)}</span>
            </button>
          ))}
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={soloDisponibles}
            onChange={(e) => setSoloDisponibles(e.target.checked)}
          />
          Solo disponibles
        </label>
      </div>

      {grupos.length === 0 ? (
        <div className={styles.estadoVacio}>
          <p className={styles.estadoTitulo}>Ningún producto coincide con el filtro</p>
          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.meta.key} className={styles.grupo} data-cat={grupo.meta.token}>
            <header className={styles.grupoHeader}>
              <span className={styles.grupoRiel} aria-hidden="true" />
              <h3 className={styles.grupoTitulo}>{grupo.meta.label}</h3>
              <span className={styles.grupoConteo}>
                {grupo.productos.length}
                {hayFiltros && conteos.get(grupo.meta.key) !== grupo.productos.length && (
                  <span className={styles.grupoConteoTotal}> de {conteos.get(grupo.meta.key)}</span>
                )}
              </span>
            </header>

            <div className={styles.grid}>
              {grupo.productos.map((p) => (
                <article
                  key={p.id}
                  className={styles.card}
                  data-cat={grupo.meta.token}
                  data-agotado={!p.disponible}
                >
                  <div className={styles.cardTop}>
                    <h4 className={styles.nombre}>{p.nombre}</h4>
                    {!p.disponible && <span className={styles.agotado}>Agotado</span>}
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.precio}>${p.precio.toLocaleString('es-CL')}</span>
                    <div className={styles.acciones}>
                      <button type="button" onClick={() => onEdit(p)}>
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => onDelete(p.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
