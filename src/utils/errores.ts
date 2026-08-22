import { ZodError } from 'zod';

/**
 * Traduce cualquier error de guardado a un mensaje legible para el usuario.
 *
 * Sin esto, un fallo de validación de esquema llegaba al banner de error como
 * el `message` crudo de ZodError, que es un JSON con `code`, `path`, `minimum`,
 * etc. — ilegible para quien está usando la app. Aquí se extrae el mensaje del
 * primer problema y se antepone el campo afectado.
 */
export function mensajeDeError(err: unknown): string {
  if (err instanceof ZodError) {
    const problema = err.issues[0];
    if (!problema) return 'Datos inválidos';
    const campo = problema.path.filter((p) => typeof p === 'string').join('.');
    return campo ? `${campo}: ${problema.message}` : problema.message;
  }
  if (err instanceof Error) return err.message;
  return 'Error al guardar';
}
