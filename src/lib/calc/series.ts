// Utilidades de series: compactación para el cliente y búsquedas por fecha.
import type { Punto } from '../types';
import { addDays } from './fechas';

/** Diario en los últimos `anios` años; semanal (último dato de cada semana ISO) antes. */
export function compactar(serie: Punto[], anios = 5): Punto[] {
  if (!serie.length) return serie;
  const corte = addDays(serie[serie.length - 1].date, -365 * anios);
  const antiguos = serie.filter((p) => p.date < corte);
  const recientes = serie.filter((p) => p.date >= corte);
  const semanal: Punto[] = [];
  let claveAnt = '';
  for (const p of antiguos) {
    const d = new Date(`${p.date}T00:00:00Z`);
    const lunes = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
    if (lunes === claveAnt) semanal[semanal.length - 1] = p;
    else semanal.push(p);
    claveAnt = lunes;
  }
  return [...semanal, ...recientes];
}

export function desde<T extends { date: string }>(serie: T[], fecha: string): T[] {
  return serie.filter((p) => p.date >= fecha);
}

/** Último punto con fecha ≤ f. */
export function valorEn(serie: Punto[], f: string): Punto | null {
  let r: Punto | null = null;
  for (const p of serie) {
    if (p.date <= f) r = p;
    else break;
  }
  return r;
}

export const aPuntos = (s: Array<{ date: string; close: number }>): Punto[] => s.map((p) => ({ date: p.date, value: p.close }));
