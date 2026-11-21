// Detección de sucesos (cruces), regla «heredada» y estados de tarjeta (secciones 4.1 y 4.2).
import { addDays } from './fechas';
import { serieDrawdown, type Cierre } from './drawdown';
import { CONDICIONES } from '../config';
import type { EstadoCondicion } from '../types';

export interface ResultadoSucesos {
  cumplidaHoy: boolean;
  /** Cruces (no cumplida → cumplida) dentro del horizonte [hoy − horizonte, hoy]. */
  sucesos: string[];
  /** Primera fecha de cruce dentro del horizonte (la que se muestra). */
  fechaSuceso: string | null;
  heredada: boolean;
  /** Inicio del tramo cumplido actual, si se cumple hoy. */
  cumplidaDesde: string | null;
  /** Hubo suceso en los últimos 90 días pero hoy no se cumple. */
  recuperada: boolean;
}

/**
 * A partir de una serie de booleanos diarios (cumplida o no), calcula los cruces.
 * Regla D7: si se cumple de forma continua desde antes de hoy − 90 días, es «heredada»:
 * ese tramo no genera suceso (salvo que vuelva a cruzar).
 */
export function detectarSucesos(
  dias: Array<{ date: string; cumplida: boolean }>,
  hoy: string,
  opts: { horizonteDias?: number; heredadaDias?: number } = {},
): ResultadoSucesos {
  const horizonte = opts.horizonteDias ?? CONDICIONES.horizonteDias;
  const herDias = opts.heredadaDias ?? CONDICIONES.heredadaDias;
  const inicioHorizonte = addDays(hoy, -horizonte);
  const limiteHeredada = addDays(hoy, -herDias);
  const cruces: string[] = [];
  let prev = false;
  let tramoInicio: string | null = null;
  // El primer punto de la serie, si ya se cumple, no es un cruce observado: es un tramo heredado de origen.
  let primer = true;
  for (const d of dias) {
    if (d.cumplida && !prev) {
      tramoInicio = d.date;
      if (!primer) cruces.push(d.date);
    }
    if (!d.cumplida) tramoInicio = null;
    prev = d.cumplida;
    primer = false;
  }
  const cumplidaHoy = dias.length ? dias[dias.length - 1].cumplida : false;
  const cumplidaDesde = cumplidaHoy ? tramoInicio : null;
  const heredada = cumplidaHoy && cumplidaDesde !== null && cumplidaDesde < limiteHeredada;
  const sucesos = cruces.filter((f) => f >= inicioHorizonte && f <= hoy && !(heredada && f === cumplidaDesde));
  const ult90 = sucesos.filter((f) => f >= limiteHeredada);
  return {
    cumplidaHoy,
    sucesos,
    fechaSuceso: sucesos[0] ?? null,
    heredada,
    cumplidaDesde,
    recuperada: !cumplidaHoy && ult90.length > 0,
  };
}

/** Condiciones de precio (c1–c3): umbral u desde el ATH de cierre. */
export function sucesosPrecio(serie: Cierre[], u: number, hoy: string) {
  const dd = serieDrawdown(serie, u);
  return detectarSucesos(dd.map((p) => ({ date: p.date, cumplida: p.cumplida })), hoy);
}

/**
 * c4: 5 valores diarios publicados consecutivos ≤ 1,00 $/h. La fecha de suceso es el 5.º día.
 * Devuelve la serie de booleanos «cumplida» (racha ≥ 5) para pasarla a detectarSucesos.
 */
export function diasC4(serie: Array<{ date: string; value: number }>, max = CONDICIONES.c4PrecioMax, n = CONDICIONES.c4DiasSeguidos) {
  let racha = 0;
  return serie.map((p) => {
    racha = p.value <= max ? racha + 1 : 0;
    return { date: p.date, cumplida: racha >= n, racha };
  });
}

export function rachaActualC4(serie: Array<{ date: string; value: number }>, max = CONDICIONES.c4PrecioMax): number {
  let r = 0;
  for (let i = serie.length - 1; i >= 0 && serie[i].value <= max; i--) r++;
  return r;
}

/** Estado de tarjeta según la tabla de la sección 4.2. */
export function estadoCondicion(args: {
  sinDato: boolean;
  cumplidaHoy: boolean | null;
  heredada: boolean;
  sucesoUlt90: boolean;
  proximidad: number | null;
}): EstadoCondicion {
  if (args.sinDato || args.proximidad === null) return 'sin_dato';
  if ((args.cumplidaHoy && !args.heredada) || args.sucesoUlt90) return 'cumplida';
  if (args.cumplidaHoy && args.heredada) return 'cumplida';
  if (args.proximidad >= CONDICIONES.estados.muyCerca) return 'muy_cerca';
  if (args.proximidad >= CONDICIONES.estados.vigilancia) return 'vigilancia';
  return 'lejos';
}
