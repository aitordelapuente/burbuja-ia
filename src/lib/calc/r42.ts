// I20: peor racha de 42 sesiones (^SOX desde 1994).
import type { Cierre } from './drawdown';
import { mesAnio } from './formato';

export function serieR42(serie: Cierre[], n = 42): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (let i = n; i < serie.length; i++) out.push({ date: serie[i].date, value: serie[i].close / serie[i - n].close - 1 });
  return out;
}

export interface ResultadoR42 {
  actual: number | null;
  fecha: string | null;
  /** Último día anterior al episodio actual con un r42 inferior al actual. */
  anteriorFecha: string | null;
  anteriorValor: number | null;
  texto: string;
  serie: Array<{ date: string; value: number }>;
}

/**
 * Busca el último r42 inferior al actual, excluyendo el episodio actual (las últimas `exclusion` sesiones).
 */
export function peorRacha(serie: Cierre[], n = 42, exclusion = 63): ResultadoR42 {
  const s = serieR42(serie, n);
  if (!s.length) return { actual: null, fecha: null, anteriorFecha: null, anteriorValor: null, texto: 'Sin dato', serie: s };
  const ult = s[s.length - 1];
  let anterior: { date: string; value: number } | null = null;
  for (let i = s.length - 1 - exclusion; i >= 0; i--) {
    if (s[i].value < ult.value) {
      anterior = s[i];
      break;
    }
  }
  const texto = anterior
    ? `Peor caída en 2 meses desde ${mesAnio(anterior.date)}`
    : 'Peor caída en 2 meses de toda la serie';
  return { actual: ult.value, fecha: ult.date, anteriorFecha: anterior?.date ?? null, anteriorValor: anterior?.value ?? null, texto, serie: s };
}
