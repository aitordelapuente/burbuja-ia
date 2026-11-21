// Ventana de 90 días del criterio de Polymarket (sección 4.1).
import { diffDays } from './fechas';
import { CONDICIONES } from '../config';

export interface Suceso {
  cond: string; // c1…c6 (c3 cuenta como una sola aunque caigan varios proveedores)
  fecha: string;
}

export interface ResultadoVentana {
  n: number;
  enVentana: string[];
  pinchazo: boolean;
  inicio: string | null;
  fin: string | null;
}

/**
 * Busca la ventana de ≤ 90 días naturales (que termine ≤ límite) con más condiciones distintas.
 * Pinchazo si hay ≥ 3 condiciones distintas.
 */
export function evaluarVentana(sucesos: Suceso[], limite: string, dias = CONDICIONES.ventanaDias): ResultadoVentana {
  const validos = sucesos.filter((s) => s.fecha <= limite).sort((a, b) => a.fecha.localeCompare(b.fecha));
  let mejor: ResultadoVentana = { n: 0, enVentana: [], pinchazo: false, inicio: null, fin: null };
  for (let j = 0; j < validos.length; j++) {
    const fin = validos[j].fecha;
    // primera aparición por condición dentro de [fin − dias, fin]
    const porCond = new Map<string, string>();
    for (let i = 0; i <= j; i++) {
      const s = validos[i];
      if (diffDays(fin, s.fecha) <= dias && !porCond.has(s.cond)) porCond.set(s.cond, s.fecha);
    }
    const n = porCond.size;
    const inicio = Array.from(porCond.values()).sort()[0] ?? null;
    // a igualdad de n, preferir la ventana más reciente
    if (n > mejor.n || (n === mejor.n && n > 0)) {
      mejor = { n, enVentana: Array.from(porCond.keys()).sort(), pinchazo: n >= 3, inicio, fin };
    }
  }
  return mejor;
}
