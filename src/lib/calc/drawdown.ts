// Caídas desde el máximo histórico de cierre (sección 4.1).
export type Cierre = { date: string; close: number };

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export interface PuntoDD {
  date: string;
  close: number;
  ath: number;
  athFecha: string;
  dd: number;
  umbral: number;
  cumplida: boolean;
}

/** Recorre la serie y calcula ATH(d), dd(d), precio umbral(d) y si se cumple cada día. */
export function serieDrawdown(serie: Cierre[], u: number): PuntoDD[] {
  let ath = -Infinity;
  let athFecha = '';
  const out: PuntoDD[] = [];
  for (const p of serie) {
    if (p.close > ath) {
      ath = p.close;
      athFecha = p.date;
    }
    const umbral = ath * (1 - u);
    out.push({ date: p.date, close: p.close, ath, athFecha, dd: p.close / ath - 1, umbral, cumplida: p.close <= umbral });
  }
  return out;
}

export interface InfoDrawdown {
  fecha: string;
  close: number;
  ath: number;
  athFecha: string;
  dd: number; // fracción negativa
  precioUmbral: number;
  /** Caída adicional que falta hasta el umbral: umbral / close − 1 (negativa si aún no se ha llegado). */
  distancia: number;
  proximidad: number; // 0-100
  cumplidaHoy: boolean;
}

export function drawdown(close: number, ath: number, u: number) {
  const dd = close / ath - 1;
  const precioUmbral = ath * (1 - u);
  const distancia = precioUmbral / close - 1;
  const proximidad = clamp(Math.abs(Math.min(0, dd)) / u) * 100;
  return { dd, precioUmbral, distancia, proximidad, cumplidaHoy: close <= precioUmbral };
}

export function infoDrawdown(serie: Cierre[], u: number): InfoDrawdown | null {
  if (!serie.length) return null;
  const s = serieDrawdown(serie, u);
  const ult = s[s.length - 1];
  const d = drawdown(ult.close, ult.ath, u);
  return { fecha: ult.date, close: ult.close, ath: ult.ath, athFecha: ult.athFecha, ...d };
}

/** Variación entre el último cierre y el de n sesiones antes. */
export function variacion(serie: Cierre[], n: number): number | null {
  if (serie.length <= n) return null;
  const a = serie[serie.length - 1 - n].close;
  const b = serie[serie.length - 1].close;
  return b / a - 1;
}

/** Variación frente al cierre más cercano (anterior o igual) a hace `dias` días naturales. */
export function variacionDias(serie: { date: string; value: number }[], dias: number, hoy?: string): number | null {
  if (!serie.length) return null;
  const ult = serie[serie.length - 1];
  const ref = hoy ?? ult.date;
  const objetivo = new Date(new Date(`${ref}T00:00:00Z`).getTime() - dias * 86400000).toISOString().slice(0, 10);
  let base: { date: string; value: number } | null = null;
  for (const p of serie) {
    if (p.date <= objetivo) base = p;
    else break;
  }
  if (!base || base.value === 0) return null;
  return ult.value / base.value - 1;
}
