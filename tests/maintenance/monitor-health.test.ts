// Sección 14 «Mantenimiento», test 8: J3 con issues deduplicados, cierre tras 2 verdes y avisos solo al abrir y cerrar.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ejecutarDespliegue, ejecutarJ3 } from '../../scripts/monitor/run';
import { notificadorDesdeEntorno } from '../../scripts/monitor/issues';
import { crearClienteGitHub } from '../../scripts/lib/github';
import { crearServidor, fixtureJson, githubSimulado, repoTemporal } from './helpers';

const SITE = 'https://panel.example.test';
const gh = githubSimulado();
const webhooks: unknown[] = [];
const correos: unknown[] = [];
let detalle = fixtureJson('health-detalle.json') as unknown as { filas: Array<Record<string, unknown>> };
const snapshot = {
  polymarket: { reglasCambiadas: false, horizontes: [{ slug: 'ai-bubble-burst-by-june-30-2027', cerrado: false }] },
  ventana: { sucesos: [{ cond: 'c2', fecha: '2026-11-18' }] },
  indicadores: { I24b: { serie: [{ date: '2026-11-20', value: 2.65 }, { date: '2026-11-21', value: 2.69 }] } },
};
const servidor = crearServidor(
  ...gh.handlers,
  http.get(`${SITE}/api/health`, ({ request }) => {
    if (new URL(request.url).searchParams.get('detalle') !== '1') return HttpResponse.json({ ok: true });
    return request.headers.get('authorization') === 'Bearer token-salud' ? HttpResponse.json(detalle) : new HttpResponse(null, { status: 401 });
  }),
  http.get(`${SITE}/`, () => new HttpResponse('<html><h1>Panel de control del pinchazo de la IA</h1></html>', { headers: { 'content-type': 'text/html' } })),
  http.get(`${SITE}/api/snapshot`, () => HttpResponse.json(snapshot)),
  http.post('https://hooks.example.test/alerta', async ({ request }) => {
    webhooks.push(await request.json());
    return HttpResponse.json({ ok: true });
  }),
  http.post('https://api.resend.com/emails', async ({ request }) => {
    correos.push(await request.json());
    return HttpResponse.json({ id: 'correo' });
  }),
  http.get('https://inexistente.example.test/*', () => HttpResponse.error()),
);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterAll(() => servidor.close());

const cliente = crearClienteGitHub({ token: 'x', repo: gh.repo });
const notificar = notificadorDesdeEntorno({ ALERT_WEBHOOK_URL: 'https://hooks.example.test/alerta', RESEND_API_KEY: 're_prueba', ALERT_EMAIL_TO: 'alertas@example.com' });
const ahora = new Date('2026-11-21T12:00:00Z');
gh.estado.runs['collect.yml'] = '2026-11-21T06:15:00Z';
gh.estado.runs['research.yml'] = '2026-11-21T06:30:00Z';

async function ejecutar() {
  const dir = repoTemporal();
  return ejecutarJ3({ site: SITE, healthToken: 'token-salud', gh: cliente, raiz: dir, ahora, clavePresente: true, notificar, runUrl: 'https://github.com/run/1' });
}
const issuesMonitor = () => gh.estado.issues.filter((i) => i.labels.includes('monitor'));

describe('monitor/health', () => {
  it('un dato con antigüedad > umbralSinDatoH → issue [monitor] creado y aviso externo', async () => {
    const r = await ejecutar();
    expect(r.resultados.find((x) => x.id === 'datos')?.ok).toBe(false);
    const abiertos = issuesMonitor().filter((i) => i.state === 'open');
    expect(abiertos).toHaveLength(1);
    expect(abiertos[0].title).toMatch(/^\[monitor\] datos: 1 dato\(s\) sin dato: I24/);
    expect(webhooks).toHaveLength(1);
    expect(webhooks[0]).toMatchObject({ nivel: 'error', issue_url: abiertos[0].html_url });
    expect(correos).toHaveLength(1);
    expect((correos[0] as { subject: string }).subject).toMatch(/^\[Panel pinchazo IA\] \[monitor\] datos/);
  });

  it('el suceso nuevo de c2 lanza research-urgente y un issue [suceso] informativo', () => {
    expect(gh.estado.dispatches.map((d) => d.event_type)).toContain('research-urgente');
    expect(gh.estado.issues.some((i) => i.title === '[suceso] c2: nuevo suceso el 2026-11-18')).toBe(true);
  });

  it('con un issue abierto con el mismo título → comentario y no un duplicado; sin aviso externo', async () => {
    gh.estado.issues.find((i) => i.title.startsWith('[monitor] datos:'))!.comments.length = 0;
    await ejecutar();
    const datos = issuesMonitor().filter((i) => i.title.startsWith('[monitor] datos:'));
    expect(datos).toHaveLength(1);
    expect(datos[0].comments.length).toBe(1);
    expect(webhooks).toHaveLength(1);
  });

  it('con 2 ejecuciones en verde → issue cerrado; el webhook se llama solo al cerrar', async () => {
    detalle = { filas: detalle.filas.map((f) => ({ ...f, edadHoras: 10, estado: 'ok' })) };
    await ejecutar();
    const issue = issuesMonitor().find((i) => i.title.startsWith('[monitor] datos:'))!;
    expect(issue.state).toBe('open');
    expect(webhooks).toHaveLength(1);
    await ejecutar();
    expect(issue.state).toBe('closed');
    expect(webhooks).toHaveLength(2);
    expect((webhooks[1] as { texto: string }).texto).toMatch(/^Cerrado/);
    await ejecutar();
    expect(webhooks).toHaveLength(2);
  });

  it('J3 nunca aprueba, mergea ni cierra PR', () => {
    expect(gh.estado.peticiones.filter((p) => /\/pulls\/\d+/.test(p))).toHaveLength(0);
  });

  it('modo despliegue: si /api/health y la portada fallan dos veces seguidas → rollback=true', async () => {
    const d = await ejecutarDespliegue('https://inexistente.example.test', 0, async () => {});
    expect(d.rollback).toBe(true);
    expect((await ejecutarDespliegue(SITE, 0, async () => {})).rollback).toBe(false);
  });
});
