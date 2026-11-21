// Índice de Riesgo de Pinchazo (sección 6).
import { IRP } from '../config';
import { clamp } from './drawdown';
import type { Semaforo } from '../types';

export type Componentes = {
  c1: number | null;
  c2: number | null;
  c3: number | null;
  c4: number | null;
  c5: number | null;
  c6: number | null;
  I30: number | null;
  I31: number | null;
  I32: number | null;
  I33: number | null;
  I34: number | null;
};

// --- Normalizaciones (6.1) ---
export const normC4 = (p: number | null, pRef: number | null, delta90: number | null): number | null => {
  if (p === null || pRef === null) return null;
  const nivel = pRef > 1 ? clamp((pRef - p) / (pRef - 1)) * 100 : p <= 1 ? 100 : 0;
  const tendencia = delta90 === null ? 0 : clamp(-delta90 / IRP.c4TendenciaDivisor) * 100;
  return Math.max(nivel, tendencia);
};
export const normLab = (estado: 'normal' | 'tension' | 'evento' | null): number | null =>
  estado === null ? null : estado === 'evento' ? 100 : estado === 'tension' ? 50 : 0;
export const normBono = (r: number | null) => (r === null ? null : clamp((r - IRP.bono.min) / (IRP.bono.max - IRP.bono.min)) * 100);
export const normFed = (delta180: number | null) => (delta180 === null ? null : delta180 < 0 ? 0 : delta180 === 0 ? 50 : 100);
export const normOpv = (delta60: number | null) => (delta60 === null ? null : clamp(-delta60 / IRP.opvDivisor) * 100);
export const normSemaforo = (s: Semaforo | null) =>
  s === null || s === 'sin_dato' ? null : s === 'verde' ? 0 : s === 'rojo' ? 100 : 50;
export const normGravedad = (g: number | null) => (g === null ? null : (g * 100) / 3);

function media(pesos: Record<string, number>, valores: Record<string, number | null>) {
  let suma = 0;
  let pesoTotal = 0;
  const faltan: string[] = [];
  for (const [k, w] of Object.entries(pesos)) {
    const v = valores[k];
    if (v === null || v === undefined || !Number.isFinite(v)) {
      faltan.push(k);
      continue;
    }
    suma += v * w;
    pesoTotal += w;
  }
  return { valor: pesoTotal > 0 ? suma / pesoTotal : null, faltan };
}

export function bandaIRP(v: number | null): { semaforo: Semaforo; etiqueta: string } {
  if (v === null) return { semaforo: 'sin_dato', etiqueta: 'Sin dato' };
  const b = IRP.bandas.find((x) => v < x.hasta) ?? IRP.bandas[IRP.bandas.length - 1];
  return { semaforo: b.semaforo, etiqueta: b.etiqueta };
}

export interface ResultadoIRP {
  valor: number | null;
  parcial: boolean;
  faltan: string[];
  F: number | null;
  R: number | null;
  P: number | null;
  semaforo: Semaforo;
  etiqueta: string;
  anulado: boolean;
  componentes: Record<string, number | null>;
}

export function calcularIRP(c: Componentes, pinchazoVentana = false): ResultadoIRP {
  const v = c as unknown as Record<string, number | null>;
  const F = media(IRP.pesosF, v);
  const R = media(IRP.pesosR, v);
  const P = media(IRP.pesosP, v);
  const faltan = [...F.faltan, ...R.faltan, ...P.faltan];
  let valor: number | null = null;
  if (F.valor !== null && R.valor !== null && P.valor !== null) {
    valor = IRP.pesosGlobal.F * F.valor + IRP.pesosGlobal.R * R.valor + IRP.pesosGlobal.P * P.valor;
  }
  if (pinchazoVentana) {
    return { valor: 100, parcial: faltan.length > 0, faltan, F: F.valor, R: R.valor, P: P.valor, semaforo: 'rojo', etiqueta: 'PINCHAZO (criterio Polymarket)', anulado: true, componentes: { ...v } };
  }
  const b = bandaIRP(valor);
  return { valor, parcial: faltan.length > 0, faltan, F: F.valor, R: R.valor, P: P.valor, semaforo: b.semaforo, etiqueta: b.etiqueta, anulado: false, componentes: { ...v } };
}

/** I35: divergencia financiero − real. */
export function divergencia(F: number | null, R: number | null) {
  if (F === null || R === null) return { D: null, lectura: 'Sin dato' };
  const D = F - R;
  const lectura = D >= 40 ? 'Pinchazo financiero sin reflejo real' : D <= -20 ? 'Deterioro real' : 'Ajuste mixto';
  return { D, lectura };
}
