// Sección 14 «Mantenimiento», test 7: índice abierto de alquiler (IAA), sección 18.2.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { http, HttpResponse } from 'msw';
import {
  calcularIAAhs,
  calcularIAAneo,
  descargarEntradas,
  ejecutarJ1,
  parsearAws,
  parsearAzure,
  parsearRunpod,
  parsearVast,
} from '../../scripts/collect/gpu-abierto';
import { parsearCsv } from '../../scripts/lib/ficheros';
import { crearServidor, escribir, fixtureJson, repoTemporal } from './helpers';

const servidor = crearServidor(
  http.post('https://api.runpod.io/graphql', () => HttpResponse.json(fixtureJson('runpod.json'))),
  http.get('https://cloud.vast.ai/api/v0/bundles/', ({ request }) => {
    const q = JSON.parse(new URL(request.url).searchParams.get('q') ?? '{}') as { gpu_name?: { eq?: string } };
    return HttpResponse.json(fixtureJson(q.gpu_name?.eq === 'B200' ? 'vast-b200.json' : 'vast-h100.json'));
  }),
  http.get('https://prices.azure.com/api/retail/prices', () => HttpResponse.json(fixtureJson('azure-h100.json'))),
  http.get('https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/ec2-ondemand-without-sec-sel/*', () => HttpResponse.json(fixtureJson('aws.json'))),
);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterAll(() => servidor.close());

describe('collect/iaa', () => {
  const entrada = {
    runpod: parsearRunpod(fixtureJson('runpod.json'), 'H100'),
    vast: parsearVast(fixtureJson('vast-h100.json')),
    azure: parsearAzure(fixtureJson('azure-h100.json'), 8),
    aws: parsearAws(fixtureJson('aws.json'), 'p5.48xlarge', 8),
  };

  it('con RunPod (2,69 y 4,39), Vast (mediana 2,27) y Azure/AWS (12,29 y 6,88) → IAA_neo H100 = 2,69 e IAA_hs = 9,585', () => {
    expect(entrada.runpod).toEqual({ community: 2.69, secure: 4.39 });
    expect(entrada.vast.ofertas).toBe(11);
    expect(entrada.vast.mediana).toBeCloseTo(2.27, 10);
    expect(entrada.azure).toBeCloseTo(12.29, 10);
    expect(entrada.aws).toBeCloseTo(6.88, 10);
    expect(calcularIAAneo(entrada).valor).toBe(2.69);
    expect(calcularIAAhs(entrada).valor).toBe(9.585);
  });

  it('RunPod con un precio 0 → excluido de la mediana', () => {
    const r = calcularIAAneo({ ...entrada, runpod: { community: 0, secure: 4.39 } });
    expect(r.valor).toBeCloseTo((4.39 + 2.27) / 2, 10);
    expect(String(r.detalle.excluidas)).toMatch(/precio 0/);
  });

  it('Vast con menos de 3 ofertas → excluido; una sola fuente → sin dato', () => {
    expect(calcularIAAneo({ runpod: entrada.runpod, vast: { ofertas: 2, mediana: 2.0 } }).valor).toBeNull();
    expect(calcularIAAneo({ vast: entrada.vast }).valor).toBeNull();
    expect(calcularIAAhs({ aws: 14.24 }).valor).toBeNull();
  });

  it('J1 extremo a extremo: descarga (simulada), reemplaza el día y clasifica automerge', async () => {
    const dir = repoTemporal();
    escribir(dir, 'data/auto/gpu_alquiler_abierto.csv', 'fecha,gpu,lectura,valor,fuentes_usadas,detalle_json\n2026-11-21,H100,neo,2.6,runpod+vast,{}\n2026-11-20,H100,neo,2.65,runpod+vast,{}\n');
    const entradas = await descargarEntradas();
    expect(entradas.errores).toEqual([]);
    const r = await ejecutarJ1({ raiz: dir, hoy: '2026-11-21', salida: join(dir, 'salida'), entradas, sucesos: [{ cond: 'c2', fecha: '2026-11-18' }] });
    const csv = parsearCsv(readFileSync(join(dir, 'data/auto/gpu_alquiler_abierto.csv'), 'utf8')).filas;
    const del21 = csv.filter((f) => f.fecha === '2026-11-21');
    expect(del21.map((f) => `${f.gpu} ${f.lectura} ${f.valor}`)).toEqual(['B200 neo 7.99', 'H100 hs 9.585', 'H100 neo 2.69']);
    expect(csv.find((f) => f.fecha === '2026-11-20')?.valor).toBe('2.65');
    expect(r.omitidas.join()).toMatch(/B200 hs/);
    expect(r.etiqueta).toBe('automerge');
    expect(readFileSync(join(dir, 'data/auto/sucesos.csv'), 'utf8')).toContain('2026-11-18,c2,');
    expect(readFileSync(join(dir, 'salida/labels.txt'), 'utf8').trim()).toBe('automerge');
  });
});
