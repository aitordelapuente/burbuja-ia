// Generación y lectura de los snapshots de esquema (tests/contract/snapshots/{fuente}.schema.json).
// Uso: pnpm tsx scripts/contract/snapshots.ts            → regenera desde tests/fixtures y tests/maintenance/fixtures
//      pnpm tsx scripts/contract/snapshots.ts --vivo     → regenera desde las respuestas reales (necesita red)
//      pnpm tsx scripts/contract/snapshots.ts --solo=yahoo,fred
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { escribirJson, leerArgs } from '../lib/ficheros';
import { FUENTES, ignorarClave, urlDe, type FuenteContrato } from './fuentes';
import { inferirCsv, inferirEsquema, type Esquema } from './infer';

export const DIR_SNAPSHOTS = 'tests/contract/snapshots';
export const rutaSnapshot = (raiz: string, id: string) => join(raiz, DIR_SNAPSHOTS, `${id}.schema.json`);

export function esquemaDe(f: FuenteContrato, cuerpo: string): Esquema {
  if (f.formato === 'csv') return inferirCsv(cuerpo);
  const datos = JSON.parse(cuerpo) as unknown;
  return inferirEsquema(f.recortar ? f.recortar(datos) : datos, { ignorar: ignorarClave });
}

export function leerSnapshot(raiz: string, id: string): Esquema | null {
  const p = rutaSnapshot(raiz, id);
  if (!existsSync(p)) return null;
  return (JSON.parse(readFileSync(p, 'utf8')) as { esquema: Esquema }).esquema;
}

export function escribirSnapshot(raiz: string, id: string, esquema: Esquema, origen: string) {
  escribirJson(rutaSnapshot(raiz, id), {
    _ayuda: `Esquema observado de ${id} (claves y tipos, sin valores). Generado por scripts/contract/snapshots.ts desde ${origen}. Lo compara J4 (tests/contract).`,
    fuente: id,
    esquema,
  });
}

async function principal() {
  const a = leerArgs();
  const raiz = a.raiz || process.cwd();
  const solo = a.solo ? new Set(a.solo.split(',')) : null;
  for (const f of FUENTES) {
    if (solo && !solo.has(f.id)) continue;
    if (a.vivo) {
      if (f.requiere && !process.env[f.requiere]) {
        console.log(`[contract] ${f.id}: falta ${f.requiere}, se omite`);
        continue;
      }
      if (f.id === 'polymarket-clob') {
        console.log('[contract] polymarket-clob: regenéralo con el test en vivo (necesita el token de Gamma)');
        continue;
      }
      const r = await fetch(urlDe(f), f.init?.());
      if (!r.ok) {
        console.log(`[contract] ${f.id}: HTTP ${r.status}, se omite`);
        continue;
      }
      escribirSnapshot(raiz, f.id, esquemaDe(f, await r.text()), 'la respuesta en vivo');
      console.log(`[contract] ${f.id}: snapshot regenerado en vivo`);
      continue;
    }
    const fx = f.fixtures.map((x) => join(raiz, x)).find((x) => existsSync(x));
    if (fx) escribirSnapshot(raiz, f.id, esquemaDe(f, readFileSync(fx, 'utf8')), fx.replace(`${raiz}/`, ''));
    else if (f.ejemplo !== undefined) escribirSnapshot(raiz, f.id, esquemaDe(f, JSON.stringify(f.ejemplo)), 'un ejemplo mínimo (scripts/contract/fuentes.ts)');
    else {
      console.log(`[contract] ${f.id}: sin fixture ni ejemplo`);
      continue;
    }
    console.log(`[contract] ${f.id}: snapshot regenerado`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    console.error('[contract] error', e);
    process.exit(1);
  });
}
