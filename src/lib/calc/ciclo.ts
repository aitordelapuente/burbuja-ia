// Ciclo de vida (sección 18.7): mercado principal de Polymarket, resolución, «Sin mercado activo» con ventana
// móvil, rotación de semillas del vídeo y preferencia de XBRL sobre J2. Funciones puras, sin red.
import { CONDICIONES } from '../config';
import { addDays } from './fechas';

// ---------- 18.7.1 y 18.7.4 · Mercados de Polymarket ----------

export interface MercadoPM {
  slug: string;
  question?: string;
  endDate?: string | null;
  closed?: boolean | string;
  active?: boolean;
  /** Gamma los manda como string JSON («["Yes","No"]»). */
  outcomes?: string | string[];
  outcomePrices?: string | Array<string | number>;
}

const comoLista = <T>(v: string | T[] | undefined): T[] => {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  try {
    const j = JSON.parse(v) as unknown;
    return Array.isArray(j) ? (j as T[]) : [];
  } catch {
    return [];
  }
};

export const estaCerrado = (m: MercadoPM) => m.closed === true || m.closed === 'true';

/** Mercado principal = el abierto (closed=false) con el endDate más próximo. */
export function mercadoPrincipal(mercados: MercadoPM[]): MercadoPM | null {
  const abiertos = mercados.filter((m) => !estaCerrado(m) && m.endDate).sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)));
  return abiertos[0] ?? null;
}

/** Resolución de un mercado cerrado: «Sí» si el precio de «Yes» es 1, «No» si es 0; null si no está resuelto. */
export function resolucion(m: MercadoPM): 'Sí' | 'No' | null {
  if (!estaCerrado(m)) return null;
  const outcomes = comoLista<string>(m.outcomes);
  const precios = comoLista<string | number>(m.outcomePrices).map(Number);
  const iYes = outcomes.findIndex((o) => /^yes$/i.test(o));
  const p = precios[iYes >= 0 ? iYes : 0];
  if (p === 1) return 'Sí';
  if (p === 0) return 'No';
  return null;
}

export interface EstadoMercados {
  principal: MercadoPM | null;
  /** Fecha límite de la ventana: endDate del principal; sin mercado, hoy (ventana móvil). */
  limite: string;
  sinMercadoActivo: boolean;
  /** Ventana móvil de 90 días que termina hoy (solo si no hay mercado activo). */
  ventanaMovil: { inicio: string; fin: string } | null;
  resueltos: Array<{ slug: string; fin: string | null; resultado: 'Sí' | 'No' | null; texto: string }>;
  textoM2: string;
}

export function estadoMercados(mercados: MercadoPM[], hoy: string, dias = CONDICIONES.ventanaDias): EstadoMercados {
  const principal = mercadoPrincipal(mercados);
  const resueltos = mercados
    .filter(estaCerrado)
    .sort((a, b) => String(b.endDate ?? '').localeCompare(String(a.endDate ?? '')))
    .map((m) => {
      const r = resolucion(m);
      return { slug: m.slug, fin: m.endDate ? m.endDate.slice(0, 10) : null, resultado: r, texto: r ? `Resuelto: ${r}` : 'Cerrado, pendiente de resolución' };
    });
  if (!principal) {
    return {
      principal: null,
      limite: hoy,
      sinMercadoActivo: true,
      ventanaMovil: { inicio: addDays(hoy, -dias), fin: hoy },
      resueltos,
      textoM2: 'Sin mercado activo',
    };
  }
  const ultimo = resueltos[0];
  return {
    principal,
    limite: String(principal.endDate).slice(0, 10),
    sinMercadoActivo: false,
    ventanaMovil: null,
    resueltos,
    textoM2: ultimo ? ultimo.texto : '',
  };
}

// ---------- 18.7.5 · Rotación de las semillas del vídeo ----------

export interface Semilla {
  valor: number | null;
  fecha: string;
  origen?: string; // 'video'
  fuente?: string; // 'video'
  caduca_en?: string | null;
}

export interface Sustituto {
  valor: number | null;
  fecha: string;
  verificado: boolean;
  origen?: string; // 'J2' | 'conector' | 'humano'
}

export type ModoSemilla = 'actual' | 'historico_video' | 'sin_dato_reciente';

/** `caduca_en` por defecto: fecha del vídeo + 90 días (+ 7 para la H100). */
export function caducaEnPorDefecto(fechaVideo: string, esH100 = false): string {
  return addDays(fechaVideo, esH100 ? 7 : 90);
}

export function rotarSemilla(
  semilla: Semilla,
  sustitutos: Sustituto[],
  hoy: string,
): { modo: ModoSemilla; valor: number | null; fecha: string | null; etiqueta: string; enHistorico: boolean } {
  const candidatos = sustitutos
    .filter((s) => s.verificado && s.valor !== null && s.fecha >= semilla.fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (candidatos.length) {
    const s = candidatos[0];
    return { modo: 'historico_video', valor: s.valor, fecha: s.fecha, etiqueta: 'Histórico del vídeo', enHistorico: true };
  }
  const caduca = semilla.caduca_en ?? null;
  if (caduca && hoy > caduca) {
    const ult = semilla.valor === null ? 'sin valor' : `${semilla.valor} (${semilla.fecha})`;
    return { modo: 'sin_dato_reciente', valor: null, fecha: null, etiqueta: `Sin dato reciente (último dato del vídeo: ${ult})`, enHistorico: true };
  }
  return { modo: 'actual', valor: semilla.valor, fecha: semilla.fecha, etiqueta: 'Dato del vídeo, sin verificar', enHistorico: false };
}

// ---------- 18.7.3 · Cambios de trimestre de la SEC ----------

export interface DatoXbrl {
  valor: number;
  fy: number;
  fp: string; // 'Q1'…'Q3' | 'FY'
}

export interface DatoJ2 {
  valor: number;
  trimestre: string; // 'FY2027Q3'
}

/** Trimestre «FY2027Q3» a partir de fy/fp de XBRL (sin fechas fijas en el código). */
export const trimestreXbrl = (d: Pick<DatoXbrl, 'fy' | 'fp'>) => `FY${d.fy}${d.fp === 'FY' ? 'Q4' : d.fp}`;

export const UMBRAL_DISCREPANCIA = 0.01;

/** Si hay XBRL del mismo trimestre, se usa XBRL; si difiere > 1 % del dato de J2, se devuelve un aviso. */
export function preferirXbrl(
  xbrl: DatoXbrl | null,
  j2: DatoJ2 | null,
): { valor: number | null; fuente: 'xbrl' | 'j2' | null; trimestre: string | null; diferencia: number | null; aviso: string | null } {
  if (xbrl && j2 && trimestreXbrl(xbrl) === j2.trimestre) {
    const diferencia = Math.abs(xbrl.valor / j2.valor - 1);
    const aviso =
      diferencia > UMBRAL_DISCREPANCIA
        ? `XBRL (${xbrl.valor}) y J2 (${j2.valor}) difieren un ${(diferencia * 100).toFixed(1)} % en ${j2.trimestre}`
        : null;
    return { valor: xbrl.valor, fuente: 'xbrl', trimestre: j2.trimestre, diferencia, aviso };
  }
  if (xbrl && (!j2 || trimestreXbrl(xbrl) >= j2.trimestre)) return { valor: xbrl.valor, fuente: 'xbrl', trimestre: trimestreXbrl(xbrl), diferencia: null, aviso: null };
  if (j2) return { valor: j2.valor, fuente: 'j2', trimestre: j2.trimestre, diferencia: null, aviso: null };
  return { valor: null, fuente: null, trimestre: null, diferencia: null, aviso: null };
}
