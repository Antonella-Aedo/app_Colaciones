// Procesamiento de imágenes en el renderer: reduce fotos subidas a un
// tamaño razonable para persistirlas como data URL en SQLite (foto de plato).

/** Largo máximo del lado mayor, en px — suficiente para card y modal. */
export const FOTO_LADO_MAX = 800;
const CALIDAD_JPEG = 0.82;

/** Dimensiones reducidas conservando el aspecto; nunca agranda. */
export function dimensionesParaReduccion(
  ancho: number,
  alto: number,
  ladoMax = FOTO_LADO_MAX,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMax) return { ancho, alto };
  const escala = ladoMax / mayor;
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/**
 * Lee un archivo de imagen y devuelve un data URL JPEG reducido.
 * Rechaza archivos que no sean imagen. El fondo se pinta blanco porque
 * JPEG no tiene alfa (un PNG transparente quedaría con fondo negro).
 */
export async function archivoADataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (jpg, png, webp…)');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se pudo leer la imagen'));
      i.src = url;
    });
    const { ancho, alto } = dimensionesParaReduccion(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);
    return canvas.toDataURL('image/jpeg', CALIDAD_JPEG);
  } finally {
    URL.revokeObjectURL(url);
  }
}
