// Comprobaciones de J3 (sección 18.5). Cada una devuelve un resultado; ninguna lanza excepciones.
import { TEXTOS } from '@/lib/config';
import { pedir, pedirJson } from '../lib/http';
import type { ClienteGitHub } from '../lib/github';

export type Nivel = 'error' | 'aviso';

export interface Resultado {
  id: string;
  ok: boolean;
  nivel: Nivel;
  resumen: string;
  detalle: string;
}

export interface FilaSalud {
  id: string;
  fuente?: string;
  ultimoPunto?: string | null;
  edadHoras: number | null;
  umbralStaleH: number;
  umbralSinDatoH: number;
  estado?: string;
}

const r = (id: string, ok: boolean, nivel: Nivel, resumen: string, detalle = ''): Resultado => ({ id, ok, nivel, resumen, detalle });

export async function comprobarHealth(site: string, limiteMs = 10_000): Promise<Resultado> {
  const t0 = Date.now();
  const res = await pedir(`${site}/api/health`, { reintentos: 0, timeoutMs: limiteMs });
  const ms = Date.now() - t0;
  if (res.status !== 200) return r('health', false, 'error', `/api/health responde ${res.status || res.error}`, `Tiempo: ${ms} ms.`);
  if (ms > limiteMs) return r('health', false, 'error', `/api/health tarda ${ms} ms`, '');
  return r('health', true, 'error', `/api/health 200 en ${ms} ms`);
}

/** Extrae las filas de /api/health?detalle=1 (admite un array o {filas|datos|items|detalle: []}). */
export function filasSalud(json: unknown): FilaSalud[] {
  if (Array.isArray(json)) return json as FilaSalud[];
  const o = json as Record<string, unknown>;
  for (const k of ['filas', 'datos', 'items', 'detalle']) if (Array.isArray(o?.[k])) return o[k] as FilaSalud[];
  return [];
}

export function evaluarSalud(filas: FilaSalud[]): Resultado {
  const sinDato = filas.filter((f) => f.estado === 'sin_dato' || (f.edadHoras !== null && f.edadHoras > f.umbralSinDatoH));
  const stale = filas.filter((f) => !sinDato.includes(f) && (f.estado === 'stale' || (f.edadHoras !== null && f.edadHoras > f.umbralStaleH)));
  const linea = (f: FilaSalud) => `- \`${f.id}\` (${f.fuente ?? '?'}): último punto ${f.ultimoPunto ?? '—'}, ${f.edadHoras ?? '?'} h (stale > ${f.umbralStaleH} h, sin dato > ${f.umbralSinDatoH} h)`;
  const detalle = [
    sinDato.length ? `**Sin dato:**\n${sinDato.map(linea).join('\n')}` : '',
    stale.length ? `**Stale:**\n${stale.map(linea).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  if (sinDato.length) return r('datos', false, 'error', `${sinDato.length} dato(s) sin dato: ${sinDato.map((f) => f.id).join(', ')}`, detalle);
  return r('datos', true, 'error', stale.length ? `${stale.length} dato(s) stale` : 'todos los datos al día', detalle);
}

export async function comprobarDatos(site: string, token: string): Promise<Resultado> {
  const res = await pedirJson(`${site}/api/health?detalle=1`, { headers: { authorization: `Bearer ${token}` }, reintentos: 1 });
  if (!res.ok) return r('datos', false, 'error', `/api/health?detalle=1 falla (${res.error})`);
  return evaluarSalud(filasSalud(res.data));
}

export async function comprobarPortada(site: string): Promise<Resultado> {
  const res = await pedir(`${site}/`, { reintentos: 1 });
  if (res.status !== 200) return r('portada', false, 'error', `la portada responde ${res.status || res.error}`);
  if (!res.texto.includes(TEXTOS.titulo)) return r('portada', false, 'error', 'la portada no contiene el título del panel');
  return r('portada', true, 'error', 'portada correcta');
}

export async function comprobarRun(gh: ClienteGitHub, id: string, workflow: string, horas: number, ahora: Date): Promise<Resultado> {
  try {
    const run = await gh.ultimoRunExitoso(workflow);
    if (!run) return r(id, false, 'error', `${workflow} sin ninguna ejecución correcta`);
    const h = (ahora.getTime() - Date.parse(run.fecha)) / 3_600_000;
    if (h > horas) return r(id, false, 'error', `${workflow} sin ejecución correcta en ${horas} h`, `Última correcta: ${run.fecha} (${run.url}).`);
    return r(id, true, 'error', `${workflow} correcto hace ${h.toFixed(1)} h`);
  } catch (e) {
    return r(id, false, 'aviso', `no se puede consultar ${workflow}`, String(e));
  }
}

export interface SnapshotMin {
  polymarket?: { reglasCambiadas?: boolean; horizontes?: Array<{ slug: string; cerrado?: boolean }> };
  ventana?: { sucesos?: Array<{ cond: string; fecha: string }> };
  indicadores?: Record<string, { serie?: Array<{ date: string; value: number }>; extra?: Record<string, unknown> }>;
}

export function comprobarPolymarket(s: SnapshotMin): Resultado[] {
  const reglas = s.polymarket?.reglasCambiadas
    ? r('polymarket-reglas', false, 'error', 'Polymarket ha cambiado el reglamento', 'El hash de la descripción del evento no coincide con data/seed/polymarket-reglas.sha256. Revisa la lógica.')
    : r('polymarket-reglas', true, 'error', 'reglamento sin cambios');
  const abiertos = (s.polymarket?.horizontes ?? []).filter((h) => !h.cerrado);
  const mercado = abiertos.length
    ? r('polymarket-mercado', true, 'aviso', `${abiertos.length} mercado(s) abierto(s)`)
    : r('polymarket-mercado', false, 'aviso', 'Sin mercado Polymarket activo', 'El contador X/6 sigue con una ventana móvil de 90 días que termina hoy (18.7.4).');
  return [reglas, mercado];
}

/** 18.7.3: aviso si XBRL y J2 difieren > 1 % (la app lo expone en indicadores.I13.extra.avisoXbrl). */
export function comprobarXbrl(s: SnapshotMin): Resultado {
  const aviso = s.indicadores?.I13?.extra?.avisoXbrl;
  return typeof aviso === 'string' && aviso
    ? r('sec-xbrl', false, 'aviso', 'XBRL y J2 difieren más de un 1 %', aviso)
    : r('sec-xbrl', true, 'aviso', 'sin discrepancias XBRL/J2');
}

export function comprobarPRs(prs: Awaited<ReturnType<ClienteGitHub['listarPRsAbiertos']>>, ahora: Date): Resultado[] {
  const edadDias = (p: { created_at: string }) => (ahora.getTime() - Date.parse(p.created_at)) / 86_400_000;
  const revision = prs.filter((p) => p.labels.some((l) => l.name === 'revision-humana'));
  const antiguos = revision.filter((p) => edadDias(p) > 7);
  const majors = revision.filter((p) => /^renovate\//.test(p.head?.ref ?? '') && edadDias(p) > 90);
  const lista = (ps: typeof prs) => ps.map((p) => `- #${p.number} ${p.title} (${Math.floor(edadDias(p))} días): ${p.html_url}`).join('\n');
  return [
    antiguos.length
      ? r('revision-antigua', false, 'aviso', `${antiguos.length} PR revision-humana de más de 7 días`, `No se cierran solos (política del equipo); revísalos:\n\n${lista(antiguos)}`)
      : r('revision-antigua', true, 'aviso', 'sin PR revision-humana antiguos'),
    majors.length
      ? r('renovate-majors', false, 'aviso', `${majors.length} actualización(es) mayor(es) sin mergear desde hace más de 90 días`, lista(majors))
      : r('renovate-majors', true, 'aviso', 'sin actualizaciones mayores atascadas'),
  ];
}

export function comprobarModoReducido(clavePresente: boolean): Resultado {
  return clavePresente
    ? r('investigador-reducido', true, 'aviso', 'el investigador tiene clave del LLM')
    : r('investigador-reducido', false, 'aviso', 'el investigador funciona en modo reducido', 'J2 no tiene RESEARCH_API_KEY ni PERPLEXITY_API_KEY: solo corren los pasos deterministas.');
}

// ---------- Urgencias (18.5, último punto) ----------

export const UMBRAL_PROXY_C4 = 1.2;

export function proxyC4Urgente(s: SnapshotMin): boolean {
  const serie = s.indicadores?.I24b?.serie ?? [];
  const ult = serie.slice(-2);
  return ult.length === 2 && ult.every((p) => p.value <= UMBRAL_PROXY_C4);
}

export function sucesosNuevos(s: SnapshotMin, registrados: Array<{ fecha: string; condicion: string }>): Array<{ cond: string; fecha: string }> {
  const hay = new Set(registrados.map((f) => `${f.fecha}|${f.condicion}`));
  return (s.ventana?.sucesos ?? []).filter((x) => ['c1', 'c2', 'c3'].includes(x.cond) && !hay.has(`${x.fecha}|${x.cond}`));
}
