// Sección 14 «Mantenimiento», test 4, adaptado al ajuste de seguridad: las reglas A y B de c5/c6 solo etiquetan y comentan.
// Ningún PR de c5/c6 se aprueba ni se mergea solo, ni siquiera a las 73 h con reconfirmación.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { http, HttpResponse } from 'msw';
import { accionPRC56, clasificarPR, reglaA, reglaB, type EventoC56 } from '../../scripts/research/clasificar';
import { ejecutarJ2 } from '../../scripts/research/run';
import { crearGitHubNoUsado } from './c56-helpers';
import { crearServidor, githubSimulado, repoTemporal } from './helpers';
import { manejadoresSec, manejadorLLM, paginaMedio, URL_ANT_8K } from './mocks';

const gh = githubSimulado();
const servidor = crearServidor(...gh.handlers);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const ev = (p: Partial<EventoC56>): EventoC56 => ({
  entidad: 'OpenAI',
  tipo: 'quiebra',
  fuente_url: 'https://www.reuters.com/a',
  cita: 'OpenAI filed for Chapter 11 bankruptcy protection in a Delaware court on Wednesday, according to court documents.',
  cita_verificada: 'pagina',
  tipo_fuente: 'medio',
  fecha_publicacion: '2026-11-19T10:00:00Z',
  fecha_dato: '2026-11-19',
  ...p,
});
const tres = [
  ev({}),
  ev({ fuente_url: 'https://www.ft.com/content/b', fecha_publicacion: '2026-11-19T18:00:00Z' }),
  ev({ fuente_url: 'https://www.cnbc.com/2026/11/20/c.html', fecha_publicacion: '2026-11-20T09:00:00Z' }),
];

describe('research/c56 · reglas', () => {
  it('8-K de ANT con «Item 1.03» → c5 activable por la regla A (solo etiqueta)', () => {
    const r = reglaA(ev({ entidad: 'Anthropic', fuente_url: URL_ANT_8K, cita: 'Item 1.03 Bankruptcy or Receivership.', tipo_fuente: 'primaria' }));
    expect(r).toMatchObject({ cumple: true, regla: 'A', condicion: 'c5' });
    const accion = accionPRC56(r);
    expect(accion).toMatchObject({ aprobar: false, merge: false });
    expect(accion.etiquetas).toEqual(['revision-humana', 'suceso']);
  });

  it('3 medios permitidos y verificados en 72 h sin desmentido → regla B; PR en revisión y, a las +73 h con reconfirmación, sigue sin merge', () => {
    const r = reglaB(tres);
    expect(r).toMatchObject({ cumple: true, regla: 'B', condicion: 'c5' });
    const ahora = accionPRC56(r, { horasAbierto: 1 });
    const luego = accionPRC56(reglaB(tres), { horasAbierto: 73, reconfirmada: true });
    for (const a of [ahora, luego]) {
      expect(a.aprobar).toBe(false);
      expect(a.merge).toBe(false);
      expect(a.etiquetas).toContain('revision-humana');
    }
    expect(luego.comentario).toMatch(/ningún bot aprueba ni mergea/);
  });

  it('2 medios, un desmentido, un rumor o más de 72 h → no se activa', () => {
    expect(reglaB(tres.slice(0, 2)).cumple).toBe(false);
    expect(reglaB(tres, [...tres, ev({ fuente_url: 'https://apnews.com/d', cita: 'OpenAI denies reports that it has filed for bankruptcy, a spokesperson said on Thursday.' })]).cumple).toBe(false);
    expect(reglaB([...tres.slice(0, 2), ev({ fuente_url: 'https://www.wsj.com/e', es_rumor: true })]).cumple).toBe(false);
    expect(reglaB([...tres.slice(0, 2), ev({ fuente_url: 'https://www.wsj.com/e', fecha_publicacion: '2026-11-23T12:00:00Z' })]).cumple).toBe(false);
    expect(reglaB([...tres.slice(0, 2), ev({ fuente_url: 'https://www.blog-no-permitido.com/x' })]).cumple).toBe(false);
  });

  it('cita_verificada:"snippet" → nunca cuenta para la regla B y nunca se mergea solo', () => {
    expect(reglaB([...tres.slice(0, 2), ev({ fuente_url: 'https://www.wsj.com/e', cita_verificada: 'snippet' })]).cumple).toBe(false);
    expect(reglaA(ev({ entidad: 'Anthropic', fuente_url: URL_ANT_8K, cita: 'Item 1.03 Bankruptcy or Receivership.', cita_verificada: 'snippet' })).cumple).toBe(false);
    const clas = clasificarPR(
      [
        {
          tarea: 'eventos', fichero: 'eventos', item: { tipo: 'otro' }, fuente_url: 'https://www.wsj.com/e', cita: 'x'.repeat(50), fecha_dato: '2026-11-20',
          tipo_fuente: 'medio', valor: null, modelo: 'sonar-pro', cita_verificada: 'snippet', requiere_revision: false, motivosRevision: [],
        },
      ],
      [],
    );
    expect(clas.etiquetas).not.toContain('automerge');
  });
});

describe('research/c56 · extremo a extremo con GitHub simulado', () => {
  it('regla A: el 8-K de ANT se escribe en eventos.json con regla A y el PR queda en revision-humana + suceso', async () => {
    servidor.use(...manejadoresSec({ antConQuiebra: true }));
    const dir = repoTemporal();
    const r = await ejecutarJ2({ tareas: ['eventos'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-21', env: {}, log: () => {}, gh: crearGitHubNoUsado() });
    expect(r.hayPR).toBe(true);
    expect(r.etiquetas).toEqual(['revision-humana', 'suceso']);
    const eventos = JSON.parse(readFileSync(join(dir, 'data/manual/eventos.json'), 'utf8')) as { items: Array<Record<string, unknown>> };
    expect(eventos.items[0]).toMatchObject({ entidad: 'Anthropic', tipo: 'quiebra', regla: 'A', verificado: true, cita_verificada: 'pagina', origen: 'J2' });
    expect(readFileSync(join(dir, 'salida/labels.txt'), 'utf8')).toBe('revision-humana\nsuceso\n');
    expect(gh.estado.peticiones.filter((p) => /pulls\/\d+\/(merge|reviews)/.test(p))).toHaveLength(0);
  });

  it('regla B con el LLM: 3 medios verificados → eventos.json con regla B, en revisión; con 2 medios → candidatos_c56.json, también en revisión', async () => {
    const frase = 'OpenAI filed for Chapter 11 bankruptcy protection in a Delaware court on Wednesday, according to court documents.';
    const urls = ['https://www.reuters.com/a', 'https://www.ft.com/content/b', 'https://www.cnbc.com/2026/11/20/c.html'];
    const item = (u: string, f: string) => ({ fuente_url: u, cita: frase, titulo: 'OpenAI se declara en quiebra (prueba)', fecha_dato: '2026-11-19', fecha_publicacion: f, tipo_fuente: 'medio', es_rumor: false, valor: null, entidad: 'OpenAI', tipo: 'quiebra' });
    const paginas = urls.map((u) => http.get(u, () => new HttpResponse(paginaMedio('OpenAI files for bankruptcy', frase), { headers: { 'content-type': 'text/html' } })));

    servidor.use(...manejadoresSec(), ...paginas, manejadorLLM({ items: urls.map((u, i) => item(u, `2026-11-${19 + (i > 1 ? 1 : 0)}`)) }));
    const dir = repoTemporal();
    const env = { PERPLEXITY_API_KEY: 'clave-de-prueba', C56_AUTOMERGE_TIMEOUT_H: '72' };
    const r = await ejecutarJ2({ tareas: ['eventos'], raiz: dir, salida: join(dir, 'salida'), hoy: '2026-11-21', env, log: () => {} });
    expect(r.etiquetas).toEqual(['revision-humana', 'suceso']);
    const eventos = JSON.parse(readFileSync(join(dir, 'data/manual/eventos.json'), 'utf8')) as { items: Array<Record<string, unknown>> };
    expect(eventos.items).toHaveLength(1);
    expect(eventos.items[0]).toMatchObject({ regla: 'B', entidad: 'OpenAI', tipo: 'quiebra' });
    expect(r.notas.join()).toMatch(/C56_AUTOMERGE_TIMEOUT_H se ignora/);
    expect(r.cuerpo).toMatch(/ningún bot aprueba ni mergea/);

    servidor.resetHandlers();
    servidor.use(...gh.handlers, ...manejadoresSec(), ...paginas, manejadorLLM({ items: urls.slice(0, 2).map((u) => item(u, '2026-11-19')) }));
    const dir2 = repoTemporal();
    const r2 = await ejecutarJ2({ tareas: ['eventos'], raiz: dir2, salida: join(dir2, 'salida'), hoy: '2026-11-21', env, log: () => {} });
    expect(r2.etiquetas).toContain('revision-humana');
    const eventos2 = JSON.parse(readFileSync(join(dir2, 'data/manual/eventos.json'), 'utf8')) as { items: unknown[] };
    const cand = JSON.parse(readFileSync(join(dir2, 'data/auto/candidatos_c56.json'), 'utf8')) as { items: Array<Record<string, unknown>> };
    expect(eventos2.items).toHaveLength(0);
    expect(cand.items[0]).toMatchObject({ condicion: 'c5', entidad: 'OpenAI' });
    expect(String(cand.items[0].motivo)).toMatch(/2 medio/);
  });
});
