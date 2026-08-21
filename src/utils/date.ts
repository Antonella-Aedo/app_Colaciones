/** Retorna la fecha de hoy en formato ISO yyyy-MM-dd. */
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
