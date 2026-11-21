// Cliente mínimo de la API REST de GitHub para los jobs (issues, etiquetas, runs y repository_dispatch).
// Solo usa GITHUB_TOKEN. Por decisión de seguridad no expone ninguna función para aprobar, mergear ni cerrar PR.

export interface Issue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  body?: string | null;
  labels?: Array<{ name: string } | string>;
  pull_request?: unknown;
  created_at?: string;
}

export interface Comentario {
  id: number;
  body: string;
  created_at: string;
}

export interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  labels: Array<{ name: string }>;
  head?: { ref: string };
}

export interface ClienteGitHub {
  repo: string;
  listarIssuesAbiertos(etiqueta?: string): Promise<Issue[]>;
  crearIssue(titulo: string, cuerpo: string, etiquetas: string[]): Promise<Issue>;
  comentar(numero: number, cuerpo: string): Promise<void>;
  listarComentarios(numero: number): Promise<Comentario[]>;
  cerrarIssue(numero: number): Promise<void>;
  listarPRsAbiertos(): Promise<PullRequest[]>;
  ultimoRunExitoso(workflow: string): Promise<{ fecha: string; url: string } | null>;
  repositoryDispatch(tipo: string, payload?: Record<string, unknown>): Promise<void>;
  obtenerEtiqueta(nombre: string): Promise<{ name: string; color: string; description: string | null } | null>;
  crearEtiqueta(nombre: string, color: string, descripcion: string): Promise<void>;
  actualizarEtiqueta(nombre: string, color: string, descripcion: string): Promise<void>;
}

export class ErrorGitHub extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export function crearClienteGitHub(opciones: { token: string; repo: string; api?: string }): ClienteGitHub {
  const api = (opciones.api || process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
  const { token, repo } = opciones;
  async function llamar<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const r = await fetch(`${api}${ruta}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'panel-pinchazo-ia-bot',
        ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    if (r.status === 404 && metodo === 'GET') return null as T;
    if (!r.ok) throw new ErrorGitHub(r.status, `[github] ${metodo} ${ruta} → ${r.status}`);
    if (r.status === 204) return undefined as T;
    const texto = await r.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  }
  return {
    repo,
    async listarIssuesAbiertos(etiqueta) {
      const q = new URLSearchParams({ state: 'open', per_page: '100' });
      if (etiqueta) q.set('labels', etiqueta);
      const lista = (await llamar<Issue[]>('GET', `/repos/${repo}/issues?${q}`)) ?? [];
      return lista.filter((i) => !i.pull_request);
    },
    async crearIssue(titulo, cuerpo, etiquetas) {
      return llamar<Issue>('POST', `/repos/${repo}/issues`, { title: titulo, body: cuerpo, labels: etiquetas });
    },
    async comentar(numero, cuerpo) {
      await llamar('POST', `/repos/${repo}/issues/${numero}/comments`, { body: cuerpo });
    },
    async listarComentarios(numero) {
      return (await llamar<Comentario[]>('GET', `/repos/${repo}/issues/${numero}/comments?per_page=100`)) ?? [];
    },
    async cerrarIssue(numero) {
      await llamar('PATCH', `/repos/${repo}/issues/${numero}`, { state: 'closed', state_reason: 'completed' });
    },
    async listarPRsAbiertos() {
      return (await llamar<PullRequest[]>('GET', `/repos/${repo}/pulls?state=open&per_page=100`)) ?? [];
    },
    async ultimoRunExitoso(workflow) {
      const r = await llamar<{ workflow_runs: Array<{ created_at: string; html_url: string; conclusion: string }> }>(
        'GET',
        `/repos/${repo}/actions/workflows/${workflow}/runs?status=success&per_page=1`,
      );
      const run = r?.workflow_runs?.[0];
      return run ? { fecha: run.created_at, url: run.html_url } : null;
    },
    async repositoryDispatch(tipo, payload = {}) {
      await llamar('POST', `/repos/${repo}/dispatches`, { event_type: tipo, client_payload: payload });
    },
    async obtenerEtiqueta(nombre) {
      return llamar('GET', `/repos/${repo}/labels/${encodeURIComponent(nombre)}`);
    },
    async crearEtiqueta(nombre, color, descripcion) {
      await llamar('POST', `/repos/${repo}/labels`, { name: nombre, color, description: descripcion });
    },
    async actualizarEtiqueta(nombre, color, descripcion) {
      await llamar('PATCH', `/repos/${repo}/labels/${encodeURIComponent(nombre)}`, { new_name: nombre, color, description: descripcion });
    },
  };
}

/** Cliente a partir del entorno de Actions; null si falta GITHUB_TOKEN o GITHUB_REPOSITORY. */
export function clienteDesdeEntorno(env: Record<string, string | undefined> = process.env): ClienteGitHub | null {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) return null;
  return crearClienteGitHub({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY });
}

/**
 * Abre un issue o, si ya existe uno abierto con el mismo prefijo de título, comenta en él (deduplicación por título).
 * Devuelve si se ha creado.
 */
export async function abrirOComentar(
  gh: ClienteGitHub,
  args: { prefijo: string; titulo: string; cuerpo: string; etiquetas: string[]; comentario?: string },
): Promise<{ creado: boolean; issue: Issue }> {
  const abiertos = await gh.listarIssuesAbiertos(args.etiquetas[0]);
  const existente = abiertos.find((i) => i.title.startsWith(args.prefijo));
  if (existente) {
    await gh.comentar(existente.number, args.comentario ?? args.cuerpo);
    return { creado: false, issue: existente };
  }
  return { creado: true, issue: await gh.crearIssue(args.titulo, args.cuerpo, args.etiquetas) };
}

export const enlaceRun = (env: Record<string, string | undefined> = process.env) =>
  env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : '(ejecución local)';
