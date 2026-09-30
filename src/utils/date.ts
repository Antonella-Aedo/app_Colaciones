/** Retorna la fecha de hoy en formato ISO yyyy-MM-dd (hora local, no UTC). */
export function hoyISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
