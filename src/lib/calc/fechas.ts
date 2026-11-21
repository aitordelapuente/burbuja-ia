// Utilidades de fechas en formato YYYY-MM-DD (UTC puro, sin zonas, para cálculos de calendario).
export function toDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}
export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86400000);
}
/** Días hábiles (lun-vie) entre b (exclusivo) y a (inclusivo). */
export function businessDaysBetween(a: string, b: string): number {
  if (a <= b) return 0;
  let n = 0;
  let d = toDate(b);
  const end = toDate(a);
  while (d < end) {
    d = new Date(d.getTime() + 86400000);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}
/** Fecha de hoy en la zona indicada, como YYYY-MM-DD. */
export function hoyEn(zona = 'America/New_York', ahora = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
  return p;
}
