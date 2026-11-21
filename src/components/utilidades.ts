// Utilidades de presentación compartidas por los componentes (sin estado, válidas en servidor y cliente).
import type { EstadoCondicion, Indicador, Punto, Semaforo } from '@/lib/types';
import { MENOS, NBSP, num, pct, pp, usd, musd, usdGrande } from '@/lib/calc/formato';

export const META_SEMAFORO: Record<
  Semaforo,
  { icono: string; texto: string; nivel: number; clase: string; claseTexto: string; color: string }
> = {
  verde: { icono: '●', texto: 'Verde', nivel: 1, clase: 'text-verde', claseTexto: 'text-verde-tx', color: 'var(--verde)' },
  ambar: { icono: '▲', texto: 'Ámbar', nivel: 2, clase: 'text-ambar', claseTexto: 'text-ambar-tx', color: 'var(--ambar)' },
  naranja: { icono: '▲', texto: 'Naranja', nivel: 3, clase: 'text-naranja', claseTexto: 'text-naranja-tx', color: 'var(--naranja)' },
  rojo: { icono: '■', texto: 'Rojo', nivel: 4, clase: 'text-rojo', claseTexto: 'text-rojo-tx', color: 'var(--rojo)' },
  sin_dato: { icono: '○', texto: 'Sin dato', nivel: 0, clase: 'text-gris', claseTexto: 'text-gris-tx', color: 'var(--gris)' },
};

export const META_ESTADO: Record<EstadoCondicion, { texto: string; semaforo: Semaforo }> = {
  cumplida: { texto: 'CUMPLIDA', semaforo: 'rojo' },
  muy_cerca: { texto: 'MUY CERCA', semaforo: 'naranja' },
  vigilancia: { texto: 'VIGILANCIA', semaforo: 'ambar' },
  lejos: { texto: 'LEJOS', semaforo: 'verde' },
  sin_dato: { texto: 'SIN DATO', semaforo: 'sin_dato' },
};

export const COLOR_BLOQUE = {
  financiero: { color: 'var(--azul)', texto: 'text-azul-tx', borde: 'border-t-azul', nombre: 'Financiero' },
  real: { color: 'var(--violeta)', texto: 'text-violeta-tx', borde: 'border-t-violeta', nombre: 'Real' },
} as const;

/** Claves de formato serializables (no se pueden pasar funciones a componentes cliente). */
export type TipoFormato = 'tasa' | 'usd' | 'usdh' | 'pct' | 'pctSigno' | 'pp' | 'musd' | 'usdGrande' | 'num' | 'num2' | 'entero' | 'prob';

export function formatear(v: number | null | undefined, tipo: TipoFormato): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  switch (tipo) {
    case 'usd':
      return usd(v, 2);
    case 'usdh':
      return `${usd(v, 2)}/h`;
    case 'pct':
      return pct(v, 1);
    case 'pctSigno':
      return pct(v, 1, true);
    case 'pp':
      return pp(v, 1);
    case 'musd':
      return musd(v);
    case 'usdGrande':
      return usdGrande(v);
    case 'num2':
      return num(v, 2);
    case 'tasa':
      return `${num(v, 2)}${NBSP}%`;
    case 'entero':
      return num(v, 0);
    case 'prob':
      return `${num(v * 100, 1)} %`;
    case 'num':
    default:
      return num(v, 1);
  }
}

/** Formato para el eje (más compacto). */
export function formatearEje(v: number, tipo: TipoFormato): string {
  if (!Number.isFinite(v)) return '';
  switch (tipo) {
    case 'pct':
    case 'pctSigno':
      return `${num(v * 100, 0)} %`;
    case 'tasa':
      return `${num(v, 1)} %`;
    case 'prob':
      return `${num(v * 100, 0)} %`;
    case 'usd':
    case 'usdh':
      return Math.abs(v) >= 100 ? num(v, 0) : num(v, 1, 0);
    case 'musd':
      return num(v, 0);
    case 'usdGrande':
      return Math.abs(v) >= 1e12 ? `${num(v / 1e12, 1)} B` : `${num(v / 1e6, 0)} M`;
    default:
      return Math.abs(v) >= 100 ? num(v, 0) : num(v, 1, 0);
  }
}

export function tipoPorUnidad(u: Indicador['unidad']): TipoFormato {
  switch (u) {
    case '%':
      return 'pct';
    case 'USD':
      return 'usd';
    case 'USD/h':
      return 'usdh';
    case 'pp':
      return 'pp';
    case 'MUSD':
      return 'musd';
    default:
      return 'num';
  }
}

/** Texto del valor de un indicador (valorTexto si existe; si no, según la unidad). null → null. */
export function textoValor(ind: Pick<Indicador, 'valor' | 'valorTexto' | 'unidad'>): string | null {
  if (ind.valorTexto) return ind.valorTexto;
  if (ind.valor === null || ind.valor === undefined) return null;
  if (ind.unidad === 'bool') return ind.valor ? 'Sí' : 'No';
  if (ind.unidad === 'texto') return null;
  return formatear(ind.valor, tipoPorUnidad(ind.unidad));
}

// --- Lectura defensiva de `extra` ---
export type Registro = Record<string, unknown>;

export function esRegistro(x: unknown): x is Registro {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
export function exNum(o: unknown, k: string): number | null {
  if (!esRegistro(o)) return null;
  const v = o[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
export function exStr(o: unknown, k: string): string | null {
  if (!esRegistro(o)) return null;
  const v = o[k];
  return typeof v === 'string' && v.length > 0 ? v : null;
}
export function exBool(o: unknown, k: string): boolean | null {
  if (!esRegistro(o)) return null;
  const v = o[k];
  return typeof v === 'boolean' ? v : null;
}
export function exArr(o: unknown, k: string): Registro[] {
  if (!esRegistro(o)) return [];
  const v = o[k];
  return Array.isArray(v) ? v.filter(esRegistro) : [];
}
export function exStrArr(o: unknown, k: string): string[] {
  if (!esRegistro(o)) return [];
  const v = o[k];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
export function exSerie(o: unknown, k: string): Punto[] {
  return exArr(o, k)
    .map((p) => ({ date: String(p.date ?? ''), value: typeof p.value === 'number' ? p.value : NaN }))
    .filter((p) => p.date && Number.isFinite(p.value));
}
export function exSemaforo(o: unknown, k: string): Semaforo | null {
  const v = exStr(o, k);
  return v && v in META_SEMAFORO ? (v as Semaforo) : null;
}

/** Busca un número en extra probando varias claves (tolerante con el nombre exacto). */
export function exNumAlguno(o: unknown, ...claves: string[]): number | null {
  for (const k of claves) {
    const v = exNum(o, k);
    if (v !== null) return v;
  }
  return null;
}
export function exStrAlguno(o: unknown, ...claves: string[]): string | null {
  for (const k of claves) {
    const v = exStr(o, k);
    if (v !== null) return v;
  }
  return null;
}

// --- Series ---

/** Variación entre el último punto y el de n posiciones antes. */
export function variacionN(serie: Punto[] | undefined, n: number): number | null {
  if (!serie || serie.length <= n) return null;
  const a = serie[serie.length - 1 - n].value;
  const b = serie[serie.length - 1].value;
  if (!a) return null;
  return b / a - 1;
}

/**
 * Reduce una serie para enviarla al cliente sin inventar valores: conserva todos los puntos
 * de los últimos `diasCompletos` y, antes, uno de cada k puntos reales (más el último).
 */
export function aligerar(serie: Punto[] | undefined, max = 1200, diasCompletos = 400): Punto[] {
  if (!serie || serie.length === 0) return [];
  if (serie.length <= max) return serie;
  const corte = Math.max(0, serie.length - diasCompletos);
  const recientes = serie.slice(corte);
  const antiguos = serie.slice(0, corte);
  const hueco = Math.max(1, max - recientes.length);
  const k = Math.max(1, Math.ceil(antiguos.length / hueco));
  const reducidos = antiguos.filter((_, i) => i % k === 0 || i === antiguos.length - 1);
  return [...reducidos, ...recientes];
}

export function ultimos(serie: Punto[] | undefined, n: number): Punto[] {
  if (!serie) return [];
  return serie.slice(Math.max(0, serie.length - n));
}

/** Signo menos tipográfico en textos que vengan con guion. */
export function menos(s: string): string {
  return s.replace(/(^|\s)-(?=\d)/g, `$1${MENOS}`);
}

export function esUrlVideo(url: string | null | undefined): boolean {
  return !!url && /youtube\.com\/watch\?v=/.test(url);
}

/** Segundo de la URL de YouTube (&t=123s) o null. */
export function segundoDeUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  const m = /[?&]t=(\d+)s?/.exec(url);
  return m ? Number(m[1]) : null;
}

export const ANCLAS: Array<{ id: string; modulo: string; titulo: string }> = [
  { id: 'resumen', modulo: 'M0', titulo: 'Resumen y veredicto' },
  { id: 'termometro', modulo: 'M1', titulo: 'Termómetro del mercado' },
  { id: 'polymarket', modulo: 'M2', titulo: 'Probabilidad de mercado' },
  { id: 'condiciones', modulo: 'M3', titulo: 'Las 6 condiciones de Polymarket' },
  { id: 'nvidia', modulo: 'M4', titulo: 'Nvidia: resultados y tres frentes' },
  { id: 'semis', modulo: 'M5', titulo: 'Sector de semiconductores' },
  { id: 'proveedores', modulo: 'M6', titulo: 'Proveedores de hardware' },
  { id: 'computo', modulo: 'M7', titulo: 'Economía real: alquiler de GPU' },
  { id: 'laboratorios', modulo: 'M8', titulo: 'Laboratorios (OpenAI, Anthropic)' },
  { id: 'financiacion', modulo: 'M9', titulo: 'Condiciones financieras y políticas' },
  { id: 'escenarios', modulo: 'M10', titulo: 'Escenarios y diagnóstico' },
  { id: 'puntocom', modulo: 'M11', titulo: 'Comparación con la burbuja puntocom' },
  { id: 'metodologia', modulo: 'M12', titulo: 'Metodología y fuentes' },
];

export const AYUDA_CONDICIONES: Record<string, string> = {
  c1: 'Nvidia diseña la mayoría de los chips con los que se entrena y ejecuta la IA. Su cotización resume la apuesta del mercado sobre cuánto se seguirá invirtiendo en IA.',
  c2: 'SOXX agrupa las 30 mayores empresas de semiconductores cotizadas en EE. UU., con un peso máximo por empresa. Indica si la caída es de una sola empresa o de todo el sector.',
  c3: 'TSMC fabrica los chips, ASML hace las máquinas de litografía, Broadcom diseña chips a medida y equipos de red, Arista hace redes y Supermicro monta servidores.',
  c4: 'Es probablemente el indicador más significativo: mide lo que se paga hora a hora por usar los chips. Si sobrara capacidad, sería el primer precio en hundirse.',
  c5: 'Los laboratorios alquilan casi toda la capacidad de cómputo. Su quiebra sería un pinchazo de la economía real.',
  c6: 'Una adquisición de OpenAI sería una venta de urgencia: que no pueda sobrevivir por sí sola.',
};

export const TITULO_CONDICION: Record<string, string> = {
  c1: 'NVDA −50 % desde su máximo',
  c2: 'SOXX −40 % desde su máximo',
  c3: 'Algún proveedor −50 %',
  c4: 'H100 ≤ 1 $/h durante 5 días',
  c5: 'Quiebra de OpenAI o Anthropic',
  c6: 'Adquisición de OpenAI',
};

export const IDS_CONDICIONES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const;
