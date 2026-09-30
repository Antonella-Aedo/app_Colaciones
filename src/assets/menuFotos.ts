// Fotos de menú empaquetadas con la app. `Plato.foto` guarda la CLAVE de
// este mapa (ej. 'cazuela'), no la URL — así el documento es independiente de
// cómo Vite nombra el asset en el bundle.
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

/** Resuelve la clave de foto de un plato a la URL del asset (o undefined). */
export function fotoDeMenu(clave: string | undefined): string | undefined {
  return clave ? MENU_FOTOS[clave] : undefined;
}
