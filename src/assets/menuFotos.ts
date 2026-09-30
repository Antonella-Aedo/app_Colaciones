// Fotos de menú empaquetadas con la app. `Plato.foto` guarda la CLAVE de
// este mapa (ej. 'cazuela') o un data URL cuando la foto la sube el usuario
// desde el formulario — así el documento es independiente de cómo Vite
// nombra el asset en el bundle.
import cazuela from './menus/cazuela.jpg';
import chuleta from './menus/chuleta.jpg';
import pasta from './menus/pasta.jpg';
import salmon from './menus/salmon.jpg';
import pescado from './menus/pescado.jpg';
import carne from './menus/carne.jpg';
import costillar from './menus/costillar.jpg';
import mongoliana from './menus/mongoliana.jpg';
import vegetariano from './menus/vegetariano.jpg';
import pollo from './menus/pollo.jpg';

export const MENU_FOTOS: Record<string, string> = {
  cazuela,
  chuleta,
  pasta,
  salmon,
  pescado,
  carne,
  costillar,
  mongoliana,
  vegetariano,
  pollo,
};

/**
 * Resuelve `Plato.foto` a la URL renderizable: un data URL se usa tal cual;
 * una clave apunta al asset empaquetado (o undefined si no existe).
 */
export function fotoDeMenu(foto: string | undefined): string | undefined {
  if (!foto) return undefined;
  if (foto.startsWith('data:')) return foto;
  return MENU_FOTOS[foto];
}
