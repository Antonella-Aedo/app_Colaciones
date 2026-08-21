// Taxonomía de categorías de producto — única fuente de verdad para el
// etiquetado, el orden de despliegue y el color de compartimento de cada una.
//
// Los colores no son decorativos: cada uno viene del alimento real y se
// resuelve contra los tokens `--cat-*` definidos en styles/global.css.
// El orden es el de la bandeja, no alfabético: primero lo que llena, después
// lo que acompaña, al final lo que se toma.

export interface CategoriaMeta {
  /** Clave canónica, tal como se guarda en Firestore. */
  key: string;
  /** Etiqueta visible en la UI. */
  label: string;
  /** Sufijo del token CSS `--cat-<token>` / `--cat-<token>-soft`. */
  token: string;
  /** De dónde sale el color — se documenta para que nadie lo cambie al azar. */
  origen: string;
}

export const CATEGORIAS: CategoriaMeta[] = [
  { key: 'fondo', label: 'Fondos', token: 'fondo', origen: 'tomate / pimentón' },
  { key: 'ensalada', label: 'Ensaladas', token: 'ensalada', origen: 'lechuga' },
  { key: 'agregado', label: 'Agregados', token: 'agregado', origen: 'choclo' },
  { key: 'crema', label: 'Cremas', token: 'crema', origen: 'betarraga' },
  { key: 'extra', label: 'Extras', token: 'extra', origen: 'palta' },
  { key: 'bebida', label: 'Bebidas', token: 'bebida', origen: 'agua / tupper' },
];

/** Categoría de descarte para productos sin categoría o con una no catalogada. */
export const CATEGORIA_OTRO: CategoriaMeta = {
  key: 'otro',
  label: 'Sin categoría',
  token: 'otro',
  origen: 'neutro',
};

const POR_KEY = new Map(CATEGORIAS.map((c) => [c.key, c]));

/** Normaliza el valor libre guardado en Firestore a una categoría conocida. */
export function resolverCategoria(categoria: string | undefined | null): CategoriaMeta {
  if (!categoria) return CATEGORIA_OTRO;
  return POR_KEY.get(categoria.trim().toLowerCase()) ?? CATEGORIA_OTRO;
}

/** Orden de bandeja; las no catalogadas caen siempre al final. */
export function ordenCategoria(categoria: string | undefined | null): number {
  const idx = CATEGORIAS.findIndex((c) => c.key === (categoria ?? '').trim().toLowerCase());
  return idx === -1 ? CATEGORIAS.length : idx;
}
