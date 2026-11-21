// Sección 14 «Mantenimiento», test 6: el LLM no puede inventar datos.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { http, HttpResponse } from 'msw';
import { ejecutarJ2 } from '../../scripts/research/run';
import { crearServidor, repoTemporal } from './helpers';
import { manejadorLLM } from './mocks';

const servidor = crearServidor();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const env = { PERPLEXITY_API_KEY: 'clave-de-prueba', RESEARCH_MAX_USD_DIA: '1' };

describe('research/no-inventar', () => {
  it('una respuesta con items:[] → no hay PR ni cambios', async () => {
    const llamadas: unknown[] = [];
    servidor.use(manejadorLLM({ items: [] }, llamadas));
    const dir = repoTemporal();
    const antes = readFileSync(join(dir, 'data/manual/opv.json'), 'utf8');
    const r = await ejecutarJ2({ tareas: ['opv'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-21', env, log: () => {} });
    expect(llamadas).toHaveLength(1);
    const cuerpo = llamadas[0] as { model: string; temperature: number; response_format: { type: string }; search_recency_filter?: string };
    expect(cuerpo).toMatchObject({ model: 'sonar-pro', temperature: 0, search_recency_filter: 'month' });
    expect(cuerpo.response_format.type).toBe('json_schema');
    expect(r.hayPR).toBe(false);
    expect(readFileSync(join(dir, 'data/manual/opv.json'), 'utf8')).toBe(antes);
    expect(r.costeUsd).toBeGreaterThan(0);
  });

  it('una respuesta con una URL que da 404 → descartada y sin PR', async () => {
    const url = 'https://www.reuters.com/technology/opv-inventada-2026-11-20/';
    servidor.use(
      manejadorLLM({
        items: [
          {
            fuente_url: url,
            cita: 'The AI infrastructure company raised $2,500 million in its initial public offering on Nasdaq on Thursday.',
            titulo: 'OPV inventada',
            fecha_dato: '2026-11-20',
            fecha_publicacion: '2026-11-20',
            tipo_fuente: 'medio',
            es_rumor: false,
            valor: 2500,
            empresa: 'Empresa inventada',
            estado_opv: 'completada',
          },
        ],
      }),
      http.get(url, () => new HttpResponse('Not found', { status: 404 })),
    );
    const dir = repoTemporal();
    const r = await ejecutarJ2({ tareas: ['opv'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-21', env, log: () => {} });
    expect(r.hayPR).toBe(false);
    expect(r.descartes.map((d) => d.motivo).join()).toMatch(/url_no_viva: HTTP 404/);
  });

  it('un item que no cumple el esquema (cita de menos de 40 caracteres) → descartado', async () => {
    servidor.use(manejadorLLM({ items: [{ fuente_url: 'https://www.ft.com/x', cita: 'corta', titulo: 'x', fecha_dato: '2026-11-20', tipo_fuente: 'medio', es_rumor: false }] }));
    const dir = repoTemporal();
    const r = await ejecutarJ2({ tareas: ['opv'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-21', env, log: () => {} });
    expect(r.hayPR).toBe(false);
    expect(r.descartes.map((d) => d.motivo).join()).toMatch(/esquema/);
  });

  it('con el tope de gasto agotado no se llama al LLM', async () => {
    const llamadas: unknown[] = [];
    servidor.use(manejadorLLM({ items: [] }, llamadas));
    const dir = repoTemporal();
    const r = await ejecutarJ2({ tareas: ['opv'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-21', env: { ...env, RESEARCH_MAX_USD_DIA: '0' }, log: () => {} });
    expect(llamadas).toHaveLength(0);
    expect(r.presupuestoAgotado).toBe(true);
  });
});
