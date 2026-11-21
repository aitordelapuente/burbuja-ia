// Sección 14 «Mantenimiento», test 5: sin clave del LLM, los pasos deterministas producen el PR (tarea nvidia).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ejecutarJ2 } from '../../scripts/research/run';
import { crearServidor, repoTemporal } from './helpers';
import { manejadoresSec, URL_CFO } from './mocks';

const servidor = crearServidor(...manejadoresSec());
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe('research/sin-clave', () => {
  it('sin PERPLEXITY_API_KEY no se llama al LLM y el determinista abre el PR con la previsión de 130.000 M$', async () => {
    const dir = repoTemporal();
    const salida = join(dir, 'salida');
    const r = await ejecutarJ2({ tareas: ['nvidia'], raiz: dir, salida, hoy: '2026-11-21', env: {}, log: () => {} });
    expect(r.llmActivo).toBe(false);
    expect(r.llamadas).toHaveLength(0);
    expect(r.hayPR).toBe(true);
    expect(r.etiquetas).toEqual(['automerge']);
    const nvidia = JSON.parse(readFileSync(join(dir, 'data/manual/nvidia.json'), 'utf8')) as { items: Array<Record<string, unknown>> };
    const nuevo = nvidia.items.find((i) => i.origen === 'J2');
    expect(nuevo).toMatchObject({
      trimestre: 'FY2027Q3',
      ingresos_musd: 115800,
      crec_interanual: 1.03,
      guidance_musd: 130000,
      garantia_mayor_musd: 105000,
      fuente_url: URL_CFO,
      cita_verificada: 'pagina',
      verificado: true,
      modelo: 'determinista',
      requiere_revision: false,
    });
    const cuerpo = readFileSync(join(salida, 'pr-body.md'), 'utf8');
    expect(cuerpo).toContain('guidance_musd=130000');
    expect(cuerpo).toContain('Revenue is expected to be $130.0 billion, plus or minus 3%');
    expect(cuerpo).toContain('modo reducido');
    expect(readFileSync(join(salida, 'labels.txt'), 'utf8').trim()).toBe('automerge');
    expect(readFileSync(join(salida, 'hay-cambios.txt'), 'utf8').trim()).toBe('true');

    // Segunda ejecución: el 8-K ya está procesado → ningún PR.
    const r2 = await ejecutarJ2({ tareas: ['nvidia'], raiz: dir, salida, hoy: '2026-11-21', env: {}, log: () => {} });
    expect(r2.hayPR).toBe(false);
    expect(readFileSync(join(salida, 'hay-cambios.txt'), 'utf8').trim()).toBe('false');
  });
});
