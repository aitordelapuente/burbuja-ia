// Descubrimiento semanal de eventos de Polymarket (sección 18.7.1).
// Uso: pnpm tsx scripts/research/polymarket-descubrir.ts [--salida=DIR] [--hoy=YYYY-MM-DD]
// Busca eventos con el mismo criterio («at least three of the following events») y añade los nuevos a
// data/auto/polymarket_eventos.json (la app los une a config.POLYMARKET.eventos). Si el hash del reglamento coincide
// con data/seed/polymarket-reglas.sha256 → `automerge` (alta verificada por código); si no, `revision-humana` y un
// issue «Reglamento distinto».
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { POLYMARKET } from '@/lib/config';
import { pedirJson } from '../lib/http';
import { abrirOComentar, clienteDesdeEntorno, enlaceRun, type ClienteGitHub } from '../lib/github';
import { escribirJson, escribirSalidaPR, leerArgs, leerJsonItems, SALIDA_POR_DEFECTO } from '../lib/ficheros';

export const CONSULTAS = ['AI bubble burst', 'AI industry downturn'];
export const urlBusqueda = (q: string) => `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q)}&limit_per_type=20`;
export const CRITERIO = /at least three of the following events/i;
export const RUTA_EVENTOS = 'data/auto/polymarket_eventos.json';
export const RUTA_HASH = 'data/seed/polymarket-reglas.sha256';

export interface EventoPM {
  slug: string;
  title?: string;
  description?: string;
  closed?: boolean;
  markets?: Array<{ slug: string; closed?: boolean; endDate?: string }>;
}

export const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export interface Descubierto {
  slug: string;
  titulo: string;
  hash: string;
  coincide: boolean;
  mercadosAbiertos: number;
}

/** Filtra los eventos con el mismo criterio que no estén ya en la configuración ni en el fichero. */
export function eventosNuevos(eventos: EventoPM[], conocidos: Set<string>, hashConocido: string): Descubierto[] {
  const vistos = new Set<string>();
  const out: Descubierto[] = [];
  for (const e of eventos) {
    if (!e?.slug || conocidos.has(e.slug) || vistos.has(e.slug)) continue;
    if (!CRITERIO.test(e.description ?? '')) continue;
    vistos.add(e.slug);
    const hash = sha256(e.description ?? '');
    out.push({
      slug: e.slug,
      titulo: e.title ?? e.slug,
      hash,
      coincide: hashConocido !== '' && hash === hashConocido,
      mercadosAbiertos: (e.markets ?? []).filter((m) => !m.closed).length,
    });
  }
  return out;
}

export function leerHashConocido(raiz: string): string {
  const p = join(raiz, RUTA_HASH);
  return existsSync(p) ? readFileSync(p, 'utf8').trim().split(/\s+/)[0] ?? '' : '';
}

export interface ResultadoDescubrimiento {
  nuevos: Descubierto[];
  etiquetas: string[];
  cuerpo: string;
  hayCambios: boolean;
  antes: unknown[];
  despues: unknown[];
}

export async function descubrir(o: { raiz: string; hoy: string; gh?: ClienteGitHub | null; log?: (m: string) => void }): Promise<ResultadoDescubrimiento> {
  const log = o.log ?? console.log;
  const eventos: EventoPM[] = [];
  for (const q of CONSULTAS) {
    const r = await pedirJson<{ events?: EventoPM[] }>(urlBusqueda(q));
    if (r.ok) eventos.push(...(r.data.events ?? []));
    else log(`[polymarket] búsqueda «${q}» sin respuesta: ${r.error}`);
  }
  const ruta = join(o.raiz, RUTA_EVENTOS);
  const fichero = leerJsonItems<Record<string, unknown>>(
    ruta,
    'Eventos de Polymarket descubiertos por J2 (scripts/research/polymarket-descubrir.ts). La app los añade a POLYMARKET.eventos. Cada item: {slug, titulo, descubierto_en, hash_reglamento, reglamento_coincide}.',
  );
  const conocidos = new Set<string>([...POLYMARKET.eventos, ...fichero.items.map((i) => String(i.slug))]);
  const hash = leerHashConocido(o.raiz);
  const nuevos = eventosNuevos(eventos, conocidos, hash);
  const antes = [...fichero.items];
  const despues = [
    ...antes,
    ...nuevos.map((n) => ({ slug: n.slug, titulo: n.titulo, descubierto_en: o.hoy, hash_reglamento: n.hash, reglamento_coincide: n.coincide })),
  ];
  if (nuevos.length) escribirJson(ruta, { ...fichero, items: despues });
  const distintos = nuevos.filter((n) => !n.coincide);
  const etiquetas = nuevos.length === 0 ? [] : distintos.length ? ['revision-humana'] : ['automerge'];
  if (distintos.length && o.gh) {
    for (const d of distintos) {
      await abrirOComentar(o.gh, {
        prefijo: `[monitor] Reglamento distinto: ${d.slug}`,
        titulo: `[monitor] Reglamento distinto: ${d.slug}`,
        cuerpo: `J2 ha descubierto el evento **${d.titulo}** (\`${d.slug}\`) con un reglamento cuyo hash (\`${d.hash}\`) no coincide con el conocido (\`${hash || 'vacío'}\`).\n\nEl PR queda en \`revision-humana\`. Revisa la lógica antes de mergearlo.\n\nRun: ${enlaceRun()}`,
        etiquetas: ['monitor'],
      });
    }
  }
  const cuerpo = nuevos.length
    ? [
        '### Polymarket: eventos nuevos',
        '',
        '| Slug | Título | Mercados abiertos | Reglamento |',
        '|---|---|---|---|',
        ...nuevos.map((n) => `| \`${n.slug}\` | ${n.titulo} | ${n.mercadosAbiertos} | ${n.coincide ? 'mismo hash' : `**distinto** (\`${n.hash.slice(0, 12)}…\`)`} |`),
      ].join('\n')
    : '';
  return { nuevos, etiquetas, cuerpo, hayCambios: nuevos.length > 0, antes, despues };
}

async function principal() {
  const a = leerArgs();
  const hoy = a.hoy || new Date().toISOString().slice(0, 10);
  const salida = a.salida || SALIDA_POR_DEFECTO;
  const r = await descubrir({ raiz: a.raiz || process.cwd(), hoy, gh: clienteDesdeEntorno() });
  escribirSalidaPR(salida, { cuerpo: r.cuerpo || 'Sin eventos nuevos.', etiquetas: r.etiquetas, hayCambios: r.hayCambios, titulo: `J2: eventos nuevos de Polymarket (${hoy})` });
  console.log(`[polymarket] nuevos=${r.nuevos.length} etiquetas=${r.etiquetas.join(',') || 'ninguna'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    console.error('[polymarket] error', e);
    process.exit(1);
  });
}
