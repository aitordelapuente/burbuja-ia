// Utilidades HTTP comunes a los jobs de mantenimiento (J1-J4).
// Reglas de la sección 7: timeout de 10 s, 2 reintentos con backoff (0,5 s y 1,5 s) y User-Agent configurable.
// Nunca lanzan excepciones: devuelven un resultado con ok:false.

/** Variables de entorno (process.env o un objeto de prueba). */
export type Entorno = Record<string, string | undefined>;

export const UA_NAVEGADOR = () => process.env.HTTP_USER_AGENT || 'Mozilla/5.0 (PanelPinchazoIA)';
export const UA_SEC = () => process.env.SEC_USER_AGENT || 'PanelPinchazoIA admin@example.com';

export interface RespuestaHttp {
  ok: boolean;
  status: number;
  url: string;
  texto: string;
  error?: string;
  tipo?: string | null;
}

export interface OpcionesHttp extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number;
  reintentos?: number;
  esperas?: number[];
  dormir?: (ms: number) => Promise<void>;
}

export const dormirReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** GET/POST con timeout y reintentos. Reintenta solo en errores de red, 429 y 5xx. */
export async function pedir(url: string, opciones: OpcionesHttp = {}): Promise<RespuestaHttp> {
  const { timeoutMs = 10_000, reintentos = 2, esperas = [500, 1500], dormir = dormirReal, ...init } = opciones;
  const cabeceras = new Headers(init.headers);
  if (!cabeceras.has('user-agent')) cabeceras.set('user-agent', UA_NAVEGADOR());
  let ultimo: RespuestaHttp = { ok: false, status: 0, url, texto: '', error: 'sin_intento' };
  for (let intento = 0; intento <= reintentos; intento++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { redirect: 'follow', ...init, headers: cabeceras, signal: ctrl.signal });
      const texto = await r.text();
      ultimo = { ok: r.ok, status: r.status, url: r.url || url, texto, tipo: r.headers.get('content-type') };
      if (r.ok || (r.status < 500 && r.status !== 429)) return ultimo;
      ultimo.error = `http_${r.status}`;
    } catch (e) {
      ultimo = { ok: false, status: 0, url, texto: '', error: e instanceof Error ? e.message : String(e) };
    } finally {
      clearTimeout(t);
    }
    if (intento < reintentos) await dormir(esperas[intento] ?? esperas[esperas.length - 1] ?? 1000);
  }
  return ultimo;
}

/** Igual que pedir(), pero interpreta JSON. */
export async function pedirJson<T = unknown>(
  url: string,
  opciones: OpcionesHttp = {},
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: string; status: number; texto?: string }> {
  const r = await pedir(url, opciones);
  if (!r.ok) return { ok: false, error: r.error ?? `http_${r.status}`, status: r.status, texto: r.texto.slice(0, 500) };
  try {
    return { ok: true, data: JSON.parse(r.texto) as T, status: r.status };
  } catch {
    return { ok: false, error: 'no_es_json', status: r.status, texto: r.texto.slice(0, 500) };
  }
}

/** Dominio registrable aproximado (sin «www.»), en minúsculas. */
export function dominioDe(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** true si el host de la URL es uno de los dominios o un subdominio suyo. */
export function dominioPermitido(url: string, dominios: readonly string[]): string | null {
  const host = dominioDe(url);
  if (!host) return null;
  return dominios.find((d) => host === d || host.endsWith(`.${d}`)) ?? null;
}
