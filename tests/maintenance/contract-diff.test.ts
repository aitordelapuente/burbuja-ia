// Sección 14 «Mantenimiento», test 9: diff de contrato y issue [contrato]. Ajuste de seguridad: J4 nunca lanza un agente.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FUENTES } from '../../scripts/contract/fuentes';
import { diffEsquemas, inferirEsquema } from '../../scripts/contract/infer';
import { informarContratos, type ResultadoContrato } from '../../scripts/contract/report';
import { esquemaDe, leerSnapshot } from '../../scripts/contract/snapshots';
import { crearClienteGitHub } from '../../scripts/lib/github';
import { crearServidor, githubSimulado, repoTemporal } from './helpers';

const RAIZ = join(__dirname, '..', '..');
const gh = githubSimulado();
const servidor = crearServidor(...gh.handlers);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterAll(() => servidor.close());

const yahoo = FUENTES.find((f) => f.id === 'yahoo')!;
const original = readFileSync(join(RAIZ, 'tests/fixtures/yahoo/NVDA.json'), 'utf8');
const cambiado = original.replace(/"close":/g, '"closePrice":');

function resultado(texto: string): ResultadoContrato {
  const observado = esquemaDe(yahoo, texto);
  const diff = diffEsquemas(leerSnapshot(RAIZ, 'yahoo'), observado);
  const zod = yahoo.esquemaZod!.safeParse(JSON.parse(texto));
  return { fuente: 'yahoo', conector: yahoo.conector, ok: !diff.roto, diff, observado, muestra: texto, errorZod: zod.success ? undefined : 'zod' };
}

describe('contract/diff', () => {
  it('existen snapshots de esquema para todas las fuentes y el fixture actual casa con el suyo', () => {
    for (const f of FUENTES) expect(existsSync(join(RAIZ, `tests/contract/snapshots/${f.id}.schema.json`)), f.id).toBe(true);
    expect(resultado(original).diff?.roto).toBe(false);
  });

  it('Yahoo con «close» renombrado a «closePrice» → diff con «- close» y «+ closePrice»', () => {
    const r = resultado(cambiado);
    expect(r.diff?.roto).toBe(true);
    expect(r.diff?.texto).toMatch(/^- close: array<(null\|)?number> @ chart\.result\[\]\.indicators\.quote\[\]$/m);
    expect(r.diff?.texto).toMatch(/^\+ closePrice: /m);
  });

  it('abre el issue [contrato] con el diff y la muestra ≤ 5 KB; con AUTOFIX_AGENT=off u on no se lanza ningún agente', async () => {
    const dir = repoTemporal();
    const cliente = crearClienteGitHub({ token: 'x', repo: gh.repo });
    for (const AUTOFIX_AGENT of ['off', 'on']) {
      const r = await informarContratos({ resultados: [resultado(cambiado)], gh: cliente, raiz: dir, salida: join(dir, 'salida'), env: { AUTOFIX_AGENT } });
      expect(r.agenteLanzado).toBe(false);
    }
    const issues = gh.estado.issues.filter((i) => i.labels.includes('contrato'));
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe('[contrato] yahoo ha cambiado de formato');
    expect(issues[0].body).toContain('```diff');
    expect(issues[0].body).toContain('- close');
    expect(issues[0].body).toContain('+ closePrice');
    expect(issues[0].body).toContain('src/lib/connectors/yahoo.ts');
    expect(issues[0].body).toMatch(/no se lanza/);
    expect(issues[0].body.length).toBeLessThan(5 * 1024 + 3000);
    expect(issues[0].comments[0].body).toMatch(/AUTOFIX_AGENT=on se ignora/);
    expect(gh.estado.peticiones.filter((p) => /pulls/.test(p))).toHaveLength(0);
  });

  it('solo campos nuevos → no rompe; se actualiza el snapshot y el PR queda en revision-humana', async () => {
    const dir = repoTemporal();
    const conNuevo = JSON.parse(original) as { chart: { result: Array<Record<string, unknown>> } };
    conNuevo.chart.result[0].campoNuevo = 1;
    const texto = JSON.stringify(conNuevo);
    const r = resultado(texto);
    expect(r.diff?.roto).toBe(false);
    expect(r.diff?.nuevas.join()).toMatch(/campoNuevo/);
    const inf = await informarContratos({ resultados: [r], gh: null, raiz: dir, salida: join(dir, 'salida'), env: {} });
    expect(inf.actualizados).toEqual(['yahoo']);
    expect(readFileSync(join(dir, 'salida/labels.txt'), 'utf8')).toContain('revision-humana');
    expect(readFileSync(join(dir, 'tests/contract/snapshots/yahoo.schema.json'), 'utf8')).toContain('campoNuevo');
  });

  it('inferirEsquema trata los objetos con muchas claves dinámicas como mapas', () => {
    const mapa = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`2026-01-${i}`, '2.1']));
    expect(inferirEsquema({ indexes: mapa })).toEqual({ type: 'object', properties: { indexes: { type: 'map', values: { type: 'string' } } } });
  });
});
