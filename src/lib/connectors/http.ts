// Utilidades comunes de los conectores: timeout, reintentos, modo simulado y último dato válido.
import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config';
import type { ConnectorResult } from '../types';

export const TIMEOUT_MS = 10_000;
const BACKOFF_MS = [500, 1500];

export function log(conector: string, mensaje: string) {
  // Nunca se registran claves ni cabeceras.
  console.log(`[${conector}] ${mensaje}`);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch con timeout de 10 s y 2 reintentos con backoff exponencial (0,5 s y 1,5 s). */
export async function fetchConReintentos(url: string, init: RequestInit = {}, reintentos = 2): Promise<Response> {
  let ultimoError: unknown = null;
  for (let intento = 0; intento <= reintentos; intento++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (res.ok) return res;
      ultimoError = new Error(`HTTP ${res.status}`);
      // 4xx distintos de 429 no mejoran reintentando
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (e) {
      clearTimeout(t);
      ultimoError = e;
    }
    if (intento < reintentos) await dormir(BACKOFF_MS[intento] ?? 1500);
  }
  throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
}

export const ahoraIso = () => new Date().toISOString();

/** Lee un fixture JSON o de texto de tests/fixtures/{conector}/{nombre}. */
export async function leerFixture(conector: string, nombre: string): Promise<string> {
  const p = path.join(process.cwd(), 'tests', 'fixtures', conector, nombre);
  return fs.readFile(p, 'utf8');
}

/** Permite simular la caída de un conector en modo simulado: MOCK_FAIL=yahoo,fred */
export function fallaSimulada(conector: string): boolean {
  return env.mock() && (process.env.MOCK_FAIL || '').split(',').map((s) => s.trim()).includes(conector);
}

type Guardado<T> = { data: T; fetchedAt: string };
const memoria = new Map<string, Guardado<unknown>>();

/**
 * Ejecuta `obtener` con la caché de datos de Next (unstable_cache). Si la fuente falla,
 * se sirve el último valor válido (de la caché de Next o de memoria) marcado como `stale`.
 */
export async function conCache<T>(
  conector: string,
  clave: string[],
  revalidate: number,
  obtener: () => Promise<T>,
): Promise<ConnectorResult<T>> {
  const source = conector;
  const key = [conector, ...clave].join(':');
  if (env.mock()) {
    if (fallaSimulada(conector)) return { ok: false, error: 'fallo simulado', source, fetchedAt: ahoraIso() };
    try {
      const data = await obtener();
      return { ok: true, data, source, fetchedAt: ahoraIso() };
    } catch (e) {
      return { ok: false, error: (e as Error).message, source, fetchedAt: ahoraIso() };
    }
  }
  try {
    const { unstable_cache } = await import('next/cache');
    const cacheada = unstable_cache(
      async (): Promise<Guardado<T>> => ({ data: await obtener(), fetchedAt: ahoraIso() }),
      [key],
      { revalidate, tags: [conector, `snapshot-${conector}`] },
    );
    const g = await cacheada();
    memoria.set(key, g);
    const edad = (Date.now() - new Date(g.fetchedAt).getTime()) / 1000;
    return { ok: true, data: g.data, source, fetchedAt: g.fetchedAt, stale: edad > revalidate * 4 };
  } catch (e) {
    log(conector, `fallo en ${clave.join('/')}: ${(e as Error).message}`);
    const g = memoria.get(key) as Guardado<T> | undefined;
    if (g) return { ok: true, data: g.data, source, fetchedAt: g.fetchedAt, stale: true };
    return { ok: false, error: (e as Error).message, source, fetchedAt: ahoraIso() };
  }
}
