// Tabla consolidada de datos (sección 18.1) para /api/health?detalle=1.
import type { Snapshot } from './types';
import { businessDaysBetween } from './calc/fechas';

export interface FilaSalud {
  id: string;
  fuente: string;
  ultimoPunto: string | null;
  edadHoras: number | null;
  umbralStaleH: number | null;
  umbralSinDatoH: number | null;
  estado: 'ok' | 'stale' | 'sin_dato';
}

const H_DIA = 24;
/** [id, indicador del snapshot, fuente, stale, sinDato, unidad: 'habiles' | 'naturales' | null] */
const FILAS: Array<[string, string, string, number | null, number | null, 'habiles' | 'naturales' | null]> = [
  ['cierres-yahoo', 'I01', 'Yahoo chart v8', 2, 5, 'habiles'],
  ['acciones-nvda', 'I42', 'SEC dei:EntityCommonStockSharesOutstanding', 120, 200, 'naturales'],
  ['polymarket', 'I04', 'Polymarket Gamma + CLOB', 1, 3, 'naturales'],
  ['reglamento-polymarket', 'I06', 'Polymarket Gamma (hash)', 7, 30, 'naturales'],
  ['ingresos-nvda', 'I13', 'SEC XBRL us-gaap/Revenues + 8-K (J2)', 120, 200, 'naturales'],
  ['prevision-nvda', 'I14', 'SEC 8-K de resultados (J2)', 120, 200, 'naturales'],
  ['garantias-nvda', 'I15', 'SEC XBRL GuaranteeObligationsMaximumExposure + CFO commentary', 120, 200, 'naturales'],
  ['concentracion-garantias', 'I16', 'CFO commentary (J2)', 120, 200, 'naturales'],
  ['acuerdos-neoclouds', 'I18', 'CFO commentary (J2)', 120, 200, 'naturales'],
  ['frentes-nvidia', 'I17', 'J2 (registro de eventos)', null, null, null],
  ['h100-silicondata', 'I24', 'Silicon Data SDH100RT (API o página pública vía J2)', 3, 7, 'habiles'],
  ['indice-abierto-gpu', 'I24b', 'RunPod, Vast.ai, Azure y AWS (J1)', 2, 5, 'naturales'],
  ['eventos-c5c6', 'c5', 'J2: EDGAR de Anthropic, GDELT y LLM', null, null, null],
  ['estado-laboratorios', 'I27', 'J2', 30, 90, 'naturales'],
  ['financiacion-labs', 'I29', 'J2', 45, 120, 'naturales'],
  ['opv', 'I32', 'Yahoo IPO + J2', 2, 5, 'habiles'],
  ['bono-10a', 'I30', 'FRED DGS10', 3, 7, 'habiles'],
  ['tipo-fed', 'I31', 'FRED DFEDTARU/DFEDTARL', 10, 30, 'naturales'],
  ['regulacion', 'I34', 'J2: Federal Register, GDELT y LLM', null, null, null],
];

function ultimaFecha(s: Snapshot, id: string): string | null {
  const ind = s.indicadores[id] ?? s.condiciones.find((c) => c.id === id);
  if (!ind) return null;
  if (ind.serie && ind.serie.length) return ind.serie[ind.serie.length - 1].date;
  return ind.actualizadoEn ? ind.actualizadoEn.slice(0, 10) : null;
}

export function tablaSalud(s: Snapshot): FilaSalud[] {
  return FILAS.map(([id, ind, fuente, st, sd, unidad]) => {
    const ultimo = ultimaFecha(s, ind);
    const edadH = ultimo ? Math.max(0, Math.round((new Date(`${s.hoy}T23:59:59Z`).getTime() - new Date(`${ultimo}T00:00:00Z`).getTime()) / 3600000)) : null;
    let estado: FilaSalud['estado'] = 'ok';
    if (unidad && ultimo) {
      const edad = unidad === 'habiles' ? businessDaysBetween(s.hoy, ultimo) : (new Date(s.hoy).getTime() - new Date(ultimo).getTime()) / 86400000;
      if (sd !== null && edad > sd) estado = 'sin_dato';
      else if (st !== null && edad > st) estado = 'stale';
    } else if (unidad && !ultimo) estado = 'sin_dato';
    const f = unidad === 'habiles' ? 1.4 * H_DIA : H_DIA; // aproximación de días hábiles a horas
    return { id, fuente, ultimoPunto: ultimo, edadHoras: edadH, umbralStaleH: st === null ? null : Math.round(st * f), umbralSinDatoH: sd === null ? null : Math.round(sd * f), estado };
  });
}
