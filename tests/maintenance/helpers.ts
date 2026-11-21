// Utilidades de los tests de mantenimiento: servidor msw, GitHub simulado en memoria y repositorio temporal.
// Todo es de prueba: ninguna petición sale a la red.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { http, HttpResponse, type JsonBodyType, type RequestHandler } from 'msw';
import { setupServer } from 'msw/node';

export const FIX = join(__dirname, 'fixtures');
export const fixture = (n: string) => readFileSync(join(FIX, n), 'utf8');
export const fixtureJson = <T extends JsonBodyType = JsonBodyType>(n: string) => JSON.parse(fixture(n)) as T;

export function crearServidor(...handlers: RequestHandler[]) {
  return setupServer(...handlers);
}

/** Copia data/ (y la plantilla del prompt) a un directorio temporal para que los tests escriban sin tocar el repo. */
export function repoTemporal(): string {
  const dir = mkdtempSync(join(tmpdir(), 'panel-mant-'));
  const raiz = join(__dirname, '..', '..');
  cpSync(join(raiz, 'data'), join(dir, 'data'), { recursive: true });
  mkdirSync(join(dir, 'salida'), { recursive: true });
  return dir;
}

export function escribir(dir: string, rel: string, contenido: string) {
  const p = join(dir, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, contenido);
}

// ---------- GitHub simulado ----------

export interface IssueSim {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  comments: Array<{ id: number; body: string; created_at: string }>;
  html_url: string;
}

export function githubSimulado(repo = 'prueba/panel-pinchazo-ia') {
  const estado = {
    issues: [] as IssueSim[],
    dispatches: [] as Array<{ event_type: string }>,
    runs: {} as Record<string, string | null>,
    pulls: [] as Array<{ number: number; title: string; html_url: string; created_at: string; labels: Array<{ name: string }>; head: { ref: string } }>,
    etiquetas: new Map<string, { name: string; color: string; description: string | null }>(),
    peticiones: [] as string[],
  };
  let n = 0;
  const base = `https://api.github.com/repos/${repo}`;
  const registrar = (r: Request) => estado.peticiones.push(`${r.method} ${new URL(r.url).pathname}`);
  const aJson = (i: IssueSim) => ({ number: i.number, title: i.title, body: i.body, state: i.state, html_url: i.html_url, labels: i.labels.map((name) => ({ name })) });
  const handlers = [
    http.get(`${base}/issues`, ({ request }) => {
      registrar(request);
      const u = new URL(request.url);
      const label = u.searchParams.get('labels');
      return HttpResponse.json(estado.issues.filter((i) => i.state === 'open' && (!label || i.labels.includes(label))).map(aJson));
    }),
    http.post(`${base}/issues`, async ({ request }) => {
      registrar(request);
      const b = (await request.json()) as { title: string; body: string; labels: string[] };
      const issue: IssueSim = { number: ++n, title: b.title, body: b.body, state: 'open', labels: b.labels ?? [], comments: [], html_url: `https://github.com/${repo}/issues/${n}` };
      estado.issues.push(issue);
      return HttpResponse.json(aJson(issue), { status: 201 });
    }),
    http.get(`${base}/issues/:num/comments`, ({ request, params }) => {
      registrar(request);
      const i = estado.issues.find((x) => x.number === Number(params.num));
      return HttpResponse.json(i?.comments ?? []);
    }),
    http.post(`${base}/issues/:num/comments`, async ({ request, params }) => {
      registrar(request);
      const i = estado.issues.find((x) => x.number === Number(params.num));
      const b = (await request.json()) as { body: string };
      i?.comments.push({ id: i.comments.length + 1, body: b.body, created_at: new Date().toISOString() });
      return HttpResponse.json({ id: 1 }, { status: 201 });
    }),
    http.patch(`${base}/issues/:num`, async ({ request, params }) => {
      registrar(request);
      const i = estado.issues.find((x) => x.number === Number(params.num));
      const b = (await request.json()) as { state?: 'open' | 'closed' };
      if (i && b.state) i.state = b.state;
      return HttpResponse.json(i ? aJson(i) : {});
    }),
    http.get(`${base}/pulls`, ({ request }) => {
      registrar(request);
      return HttpResponse.json(estado.pulls);
    }),
    http.get(`${base}/actions/workflows/:wf/runs`, ({ request, params }) => {
      registrar(request);
      const fecha = estado.runs[String(params.wf)];
      return HttpResponse.json({ workflow_runs: fecha ? [{ created_at: fecha, html_url: `https://github.com/${repo}/actions/runs/1`, conclusion: 'success' }] : [] });
    }),
    http.post(`${base}/dispatches`, async ({ request }) => {
      registrar(request);
      estado.dispatches.push((await request.json()) as { event_type: string });
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${base}/labels/:nombre`, ({ request, params }) => {
      registrar(request);
      const e = estado.etiquetas.get(decodeURIComponent(String(params.nombre)));
      return e ? HttpResponse.json(e) : HttpResponse.json({ message: 'Not Found' }, { status: 404 });
    }),
    http.post(`${base}/labels`, async ({ request }) => {
      registrar(request);
      const b = (await request.json()) as { name: string; color: string; description: string };
      estado.etiquetas.set(b.name, { name: b.name, color: b.color, description: b.description });
      return HttpResponse.json(b, { status: 201 });
    }),
    http.patch(`${base}/labels/:nombre`, async ({ request }) => {
      registrar(request);
      const b = (await request.json()) as { new_name: string; color: string; description: string };
      estado.etiquetas.set(b.new_name, { name: b.new_name, color: b.color, description: b.description });
      return HttpResponse.json(b);
    }),
    // Cualquier intento de aprobar o mergear un PR se registra (y el test lo comprueba como prohibido).
    http.all(`${base}/pulls/:num/*`, ({ request }) => {
      registrar(request);
      return HttpResponse.json({ message: 'prohibido en tests' }, { status: 403 });
    }),
  ];
  return { estado, handlers, repo };
}
