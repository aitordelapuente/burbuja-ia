// I36: diagnóstico de escenario (reglas deterministas, en orden).
import { ESCENARIOS } from '../config';
import type { CodigoEscenario, Semaforo } from '../types';

export interface EntradaEscenario {
  nVentana: number;
  F: number | null;
  R: number | null;
  c4Semaforo: Semaforo | null;
  c4Delta90: number | null;
  c4Delta30: number | null;
  labs: Array<'normal' | 'tension' | 'evento' | null>;
  evidencias?: Partial<Record<string, string>>;
}

export const TITULOS_ESCENARIO: Record<CodigoEscenario, string> = {
  PINCHAZO_PM: 'Pinchazo según Polymarket',
  E2: 'Escenario 2: el ajuste llega a la economía real',
  E1: 'Escenario 1: corrección financiera, economía real sólida',
  E1_CONTAGIO: 'Escenario 1 con señales de contagio',
  SIN: 'Sin pinchazo',
  MIXTO: 'Ajuste mixto',
};

export function diagnosticar(e: EntradaEscenario): { codigo: CodigoEscenario; titulo: string; evidencias: string[] } {
  const ev = e.evidencias ?? {};
  const lista = (...k: string[]) => k.map((x) => ev[x]).filter((x): x is string => !!x);
  const F = e.F;
  const R = e.R;
  const tension = e.labs.some((l) => l === 'tension' || l === 'evento');
  const c4Tendencia = e.c4Delta90 !== null && e.c4Delta90 <= ESCENARIOS.c4TendenciaE2;
  let codigo: CodigoEscenario;
  let evidencias: string[];
  if (e.nVentana >= 3) {
    codigo = 'PINCHAZO_PM';
    evidencias = lista('ventana', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6');
  } else if ((R !== null && R >= ESCENARIOS.rE2) || ((e.c4Semaforo === 'ambar' || e.c4Semaforo === 'rojo') && c4Tendencia) || tension) {
    codigo = 'E2';
    evidencias = lista('R', 'c4', 'labs');
  } else if (F !== null && R !== null && F >= ESCENARIOS.fMin && R < ESCENARIOS.rMax && e.c4Delta30 !== null && e.c4Delta30 >= 0) {
    codigo = 'E1';
    evidencias = lista('F', 'R', 'c4d30', 'ventana');
  } else if (F !== null && R !== null && F >= ESCENARIOS.fMin && R < ESCENARIOS.rMax && e.c4Delta30 !== null && e.c4Delta30 < 0) {
    codigo = 'E1_CONTAGIO';
    evidencias = lista('F', 'R', 'c4d30');
  } else if (F !== null && R !== null && F < ESCENARIOS.fMin && R < ESCENARIOS.rMax) {
    codigo = 'SIN';
    evidencias = lista('F', 'R');
  } else {
    codigo = 'MIXTO';
    evidencias = lista('F', 'R', 'c4d30');
  }
  return { codigo, titulo: TITULOS_ESCENARIO[codigo], evidencias };
}
