// Sección 14 «Mantenimiento», test 10: ciclo de vida de los mercados de Polymarket (18.7.1 y 18.7.4).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { http, HttpResponse } from 'msw';
import { estadoMercados, mercadoPrincipal, resolucion, type MercadoPM } from '@/lib/calc/ciclo';
import { descubrir, sha256 } from '../../scripts/research/polymarket-descubrir';
import { ejecutarJ2 } from '../../scripts/research/run';
import { crearClienteGitHub } from '../../scripts/lib/github';
import { crearServidor, escribir, fixtureJson, githubSimulado, repoTemporal } from './helpers';

const gh = githubSimulado();
const servidor = crearServidor(...gh.handlers);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers(...gh.handlers));
afterAll(() => servidor.close());

const eventos = fixtureJson('polymarket-eventos-2027.json') as unknown as Array<{ markets: MercadoPM[] }>;
const mercados = eventos[0].markets;
const busqueda = fixtureJson('public-search.json') as unknown as { events: Array<{ description: string }> };
const manejadorBusqueda = http.get('https://gamma-api.polymarket.com/public-search', () => HttpResponse.json(busqueda));

describe('lifecycle/polymarket', () => {
  it('el mercado de 2026 cerrado con outcomePrices ["0","1"] → el principal pasa a junio de 2027 y M2 muestra «Resuelto: No»', () => {
    expect(resolucion(mercados[0])).toBe('No');
    expect(mercadoPrincipal(mercados)?.slug).toBe('ai-bubble-burst-by-june-30-2027');
    const e = estadoMercados(mercados, '2027-01-02');
    expect(e.limite).toBe('2027-06-30');
    expect(e.sinMercadoActivo).toBe(false);
    expect(e.textoM2).toBe('Resuelto: No');
    expect(e.resueltos[0]).toMatchObject({ slug: 'ai-industry-downturn-by-december-31-2026-857', resultado: 'No' });
    expect(resolucion({ ...mercados[0], outcomePrices: '["1","0"]' })).toBe('Sí');
  });

  it('sin mercados abiertos → «Sin mercado activo» y ventana móvil de 90 días que termina hoy', () => {
    const e = estadoMercados(mercados.map((m) => ({ ...m, closed: true })), '2029-01-10');
    expect(e.sinMercadoActivo).toBe(true);
    expect(e.textoM2).toBe('Sin mercado activo');
    expect(e.limite).toBe('2029-01-10');
    expect(e.ventanaMovil).toEqual({ inicio: '2028-10-12', fin: '2029-01-10' });
  });

  it('un evento nuevo descubierto con el mismo hash → PR con automerge (alta en data/auto/polymarket_eventos.json)', async () => {
    servidor.use(manejadorBusqueda);
    const dir = repoTemporal();
    escribir(dir, 'data/seed/polymarket-reglas.sha256', `${sha256(busqueda.events[0].description)}\n`);
    const r = await ejecutarJ2({ tareas: ['polymarket'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-23', env: {}, log: () => {} });
    expect(r.hayPR).toBe(true);
    expect(r.etiquetas).toEqual(['automerge']);
    const f = JSON.parse(readFileSync(join(dir, 'data/auto/polymarket_eventos.json'), 'utf8')) as { items: Array<Record<string, unknown>> };
    expect(f.items).toEqual([expect.objectContaining({ slug: 'ai-bubble-burst-by-2029', reglamento_coincide: true, descubierto_en: '2026-11-23' })]);
  });

  it('con un hash distinto → revision-humana y un issue «Reglamento distinto»', async () => {
    servidor.use(manejadorBusqueda);
    const dir = repoTemporal();
    escribir(dir, 'data/seed/polymarket-reglas.sha256', 'otrohash\n');
    const r = await descubrir({ raiz: dir, hoy: '2026-11-23', gh: crearClienteGitHub({ token: 'x', repo: gh.repo }), log: () => {} });
    expect(r.etiquetas).toEqual(['revision-humana']);
    expect(gh.estado.issues.some((i) => i.title.includes('Reglamento distinto: ai-bubble-burst-by-2029'))).toBe(true);
  });
});
