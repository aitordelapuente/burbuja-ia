// Formato es-ES determinista (no depende del ICU del servidor).
export const MENOS = '−'; // «−»
export const NBSP = ' ';

function agrupar(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1234.5 → «1.234,5». */
export function num(v: number | null | undefined, decimales = 1, minDecimales?: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const neg = v < 0;
  let s = Math.abs(v).toFixed(decimales);
  if (minDecimales !== undefined && decimales > minDecimales) {
    // quita ceros sobrantes hasta minDecimales
    const [e, d = ''] = s.split('.');
    let dd = d;
    while (dd.length > minDecimales && dd.endsWith('0')) dd = dd.slice(0, -1);
    s = dd ? `${e}.${dd}` : e;
  }
  const [ent, dec] = s.split('.');
  const out = agrupar(ent) + (dec ? `,${dec}` : '');
  const esCero = Number(s) === 0;
  return (neg && !esCero ? MENOS : '') + out;
}

/** −0.475 → «−47,5 %». */
export function pct(v: number | null | undefined, decimales = 1, signo = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const n = num(v * 100, decimales);
  const pref = signo && v > 0 ? '+' : '';
  return `${pref}${n}${NBSP}%`;
}

/** Puntos porcentuales: 0.47 → «+47 pp». */
export function pp(v: number | null | undefined, decimales = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const pref = v > 0 ? '+' : '';
  return `${pref}${num(v, decimales)}${NBSP}pp`;
}

/** 125.53 → «125,53 $». */
export function usd(v: number | null | undefined, decimales = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${num(v, decimales)}${NBSP}$`;
}

/** Importes grandes en escala larga: 1,2e12 → «1,2 billones $»; 5e9 → «5.000 M$». */
export function usdGrande(v: number | null | undefined, decimales = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) {
    const x = v / 1e12;
    const palabra = Math.abs(Number(x.toFixed(decimales))) === 1 ? 'billón' : 'billones';
    return `${num(x, decimales)} ${palabra}${NBSP}$`;
  }
  if (a >= 1e6) return `${num(v / 1e6, 0)}${NBSP}M$`;
  return usd(v, 0);
}

/** Millones de USD: 115800 → «115.800 M$». */
export function musd(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${num(v, 0)}${NBSP}M$`;
}

/** '2026-11-20' → '20/11/2026'. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** '2026-11-20' → '20/11'. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2001-09-21' → 'septiembre de 2001'. */
export function mesAnio(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

/** ISO UTC → «dd/mm/aaaa hh:mm» en hora de Madrid. */
export function fechaHoraMadrid(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
}

/** Segundos → «mm:ss». */
export function mmss(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
