// J4 · Tests de contrato EN VIVO (sección 18.6). Fuera de `pnpm test`: se ejecutan con
//   pnpm vitest run --config vitest.contract.config.mts
// Cada test llama al endpoint real, valida con el esquema zod del conector (si existe), infiere el esquema observado,
// lo compara con tests/contract/snapshots/{fuente}.schema.json y guarda el resultado en $CONTRACT_OUT para report.ts.
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { escribirJson, SALIDA_POR_DEFECTO } from '../../scripts/lib/ficheros';
import { FUENTES, urlDe, type FuenteContrato } from '../../scripts/contract/fuentes';
import { diffEsquemas } from '../../scripts/contract/infer';
import { esquemaDe, leerSnapshot } from '../../scripts/contract/snapshots';
import { recortarMuestra, type ResultadoContrato } from '../../scripts/contract/report';

const RAIZ = process.cwd();
const SALIDA = process.env.CONTRACT_OUT || join(SALIDA_POR_DEFECTO, 'contract');

let tokenClob: string | null = null;

async function comprobar(f: FuenteContrato): Promise<ResultadoContrato> {
  let url = urlDe(f);
  if (f.id === 'polymarket-clob') {
    if (!tokenClob) return { fuente: f.id, conector: f.conector, ok: false, error: 'sin token de Gamma', diff: null, observado: null, muestra: '' };
    url = url.replace('{token}', tokenClob);
  }
  let texto = '';
  try {
    const r = await fetch(url, { ...f.init?.(), signal: AbortSignal.timeout(30_000) });
    texto = await r.text();
    if (!r.ok) return { fuente: f.id, conector: f.conector, ok: false, error: `HTTP ${r.status}`, diff: null, observado: null, muestra: recortarMuestra(texto) };
  } catch (e) {
    return { fuente: f.id, conector: f.conector, ok: false, error: `red: ${String(e)}`, diff: null, observado: null, muestra: '' };
  }
  let errorZod: string | undefined;
  if (f.esquemaZod && f.formato === 'json') {
    try {
      const p = f.esquemaZod.safeParse(JSON.parse(texto));
      if (!p.success) errorZod = p.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } catch {
      errorZod = 'la respuesta no es JSON';
    }
  }
  if (f.id === 'polymarket-gamma') {
    try {
      const ev = JSON.parse(texto) as Array<{ markets?: Array<{ clobTokenIds?: string; closed?: boolean }> }>;
      const m = ev[0]?.markets?.find((x) => !x.closed) ?? ev[0]?.markets?.[0];
      tokenClob = m?.clobTokenIds ? (JSON.parse(m.clobTokenIds) as string[])[0] : null;
    } catch {
      tokenClob = null;
    }
  }
  let observado = null;
  try {
    observado = esquemaDe(f, texto);
  } catch {
    errorZod = errorZod ?? 'no se puede inferir el esquema';
  }
  const diff = diffEsquemas(leerSnapshot(RAIZ, f.id), observado);
  return { fuente: f.id, conector: f.conector, ok: !errorZod && !diff.roto, errorZod, diff, observado, muestra: recortarMuestra(texto) };
}

describe('contratos en vivo', () => {
  for (const f of FUENTES) {
    const omitir = !!f.requiere && !process.env[f.requiere];
    it.skipIf(omitir)(f.id, async () => {
      const r = await comprobar(f);
      escribirJson(join(SALIDA, `${f.id}.json`), r);
      expect(r.error ?? null, `${f.id}: ${r.error}`).toBeNull();
      expect(r.errorZod ?? null, `${f.id}: zod`).toBeNull();
      expect(r.diff?.roto, `${f.id}: diff\n${r.diff?.texto}`).toBe(false);
    });
  }
});
