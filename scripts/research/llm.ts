// Cliente LLM genérico compatible con OpenAI chat/completions (sección 18.3.2).
// Por defecto, Perplexity sonar-pro (con búsqueda web). Con otro proveedor sin búsqueda web, el LLM solo extrae
// datos del texto que el código le pasa («modo extracción»). Sin clave → null y se omiten los pasos LLM.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { RespuestaLLM, type ItemLLM } from './tipos';

export interface ConfigLLM {
  url: string;
  clave: string;
  modelo: string;
  maxUsdDia: number;
  buscaEnWeb: boolean;
  esPerplexity: boolean;
  precioEntradaMTok: number;
  precioSalidaMTok: number;
  precioPeticion: number;
}

export function configLLMDesdeEntorno(env: Record<string, string | undefined> = process.env): ConfigLLM | null {
  const clave = env.RESEARCH_API_KEY || env.PERPLEXITY_API_KEY || '';
  if (!clave) return null;
  const url = env.RESEARCH_API_URL || 'https://api.perplexity.ai/chat/completions';
  const esPerplexity = /(^|\.)perplexity\.ai$/.test(safeHost(url));
  const web = (env.RESEARCH_WEB_SEARCH || 'auto').toLowerCase();
  const num = (v: string | undefined, d: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    url,
    clave,
    modelo: env.RESEARCH_MODEL || 'sonar-pro',
    maxUsdDia: num(env.RESEARCH_MAX_USD_DIA, 1),
    buscaEnWeb: web === 'auto' ? esPerplexity : web === '1' || web === 'true' || web === 'on',
    esPerplexity,
    // Precios aproximados de sonar-pro; ajustables por variable. Solo sirven para el tope de gasto estimado.
    precioEntradaMTok: num(env.RESEARCH_USD_MTOK_ENTRADA, 3),
    precioSalidaMTok: num(env.RESEARCH_USD_MTOK_SALIDA, 15),
    precioPeticion: num(env.RESEARCH_USD_PETICION, 0.01),
  };
}

function safeHost(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return '';
  }
}

export class Presupuesto {
  gastado = 0;
  constructor(
    public max: number,
    inicial = 0,
  ) {
    this.gastado = inicial;
  }
  get agotado() {
    return this.gastado >= this.max;
  }
  sumar(usd: number) {
    this.gastado += usd;
  }
}

export interface LlamadaLLM {
  tarea: string;
  modelo: string;
  usage: { prompt_tokens?: number; completion_tokens?: number } | null;
  costeUsd: number;
  ok: boolean;
  error?: string;
}

export interface RespuestaLLMParseada {
  ok: boolean;
  items: ItemLLM[];
  invalidos: Array<{ motivo: string; bruto: unknown }>;
  searchResults: Array<{ url: string; snippet?: string; title?: string }>;
  citations: string[];
  llamada: LlamadaLLM;
  error?: string;
}

export const ESQUEMA_JSON = zodToJsonSchema(RespuestaLLM, { $refStrategy: 'none' }) as Record<string, unknown>;

// ---------- Prompt (scripts/research/prompt.md) ----------

export function cargarPrompt(dir = __dirnameSeguro()): { busqueda: string; extraccion: string } {
  const md = readFileSync(join(dir, 'prompt.md'), 'utf8');
  const bloques = [...md.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  return { busqueda: bloques[0] ?? '', extraccion: bloques[1] ?? '' };
}

function __dirnameSeguro() {
  return typeof __dirname !== 'undefined' ? __dirname : join(process.cwd(), 'scripts/research');
}

export function rellenar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in valores ? valores[k] : m));
}

// ---------- Llamada ----------

export function costeEstimado(cfg: ConfigLLM, usage: LlamadaLLM['usage']): number {
  const e = usage?.prompt_tokens ?? 0;
  const s = usage?.completion_tokens ?? 0;
  return (e * cfg.precioEntradaMTok + s * cfg.precioSalidaMTok) / 1e6 + cfg.precioPeticion;
}

function extraerJson(contenido: string): unknown {
  const valla = /```(?:json)?\s*([\s\S]*?)```/i.exec(contenido);
  const limpio = (valla ? valla[1] : contenido).trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const a = contenido.indexOf('{');
    const b = contenido.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(contenido.slice(a, b + 1));
    throw new Error('respuesta sin JSON');
  }
}

export async function llamarLLM(
  cfg: ConfigLLM,
  args: { tarea: string; system: string; user: string; recencia?: 'week' | 'month' },
): Promise<RespuestaLLMParseada> {
  const cuerpoBase: Record<string, unknown> = {
    model: cfg.modelo,
    temperature: 0,
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
  };
  if (cfg.esPerplexity && cfg.buscaEnWeb && args.recencia) cuerpoBase.search_recency_filter = args.recencia;
  const conFormato = { ...cuerpoBase, response_format: { type: 'json_schema', json_schema: { name: 'respuesta_investigador', schema: ESQUEMA_JSON } } };
  const vacio = (error: string, usage: LlamadaLLM['usage'] = null): RespuestaLLMParseada => ({
    ok: false,
    items: [],
    invalidos: [],
    searchResults: [],
    citations: [],
    error,
    llamada: { tarea: args.tarea, modelo: cfg.modelo, usage, costeUsd: usage ? costeEstimado(cfg, usage) : 0, ok: false, error },
  });
  const enviar = async (cuerpo: unknown) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90_000);
    try {
      return await fetch(cfg.url, {
        method: 'POST',
        headers: { authorization: `Bearer ${cfg.clave}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
  };
  let r: Response;
  try {
    r = await enviar(conFormato);
    // Proveedores sin json_schema: se reintenta una vez sin response_format (el prompt ya exige JSON).
    if (r.status === 400 || r.status === 422) r = await enviar(cuerpoBase);
  } catch (e) {
    return vacio(`red: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!r.ok) return vacio(`http_${r.status}`);
  let datos: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: LlamadaLLM['usage'];
    citations?: string[];
    search_results?: Array<{ url: string; snippet?: string; title?: string }>;
  };
  try {
    datos = (await r.json()) as typeof datos;
  } catch {
    return vacio('respuesta_no_json');
  }
  const usage = datos.usage ?? null;
  const contenido = datos.choices?.[0]?.message?.content ?? '';
  let bruto: unknown;
  try {
    bruto = extraerJson(contenido);
  } catch {
    return vacio('contenido_sin_json', usage);
  }
  const lista = (bruto as { items?: unknown })?.items;
  const items: ItemLLM[] = [];
  const invalidos: RespuestaLLMParseada['invalidos'] = [];
  if (Array.isArray(lista)) {
    for (const it of lista.slice(0, 20)) {
      const p = RespuestaLLM.shape.items.element.safeParse(it);
      if (p.success) items.push(p.data);
      else invalidos.push({ motivo: `esquema: ${p.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`, bruto: it });
    }
  } else invalidos.push({ motivo: 'esquema: falta items[]', bruto });
  return {
    ok: true,
    items,
    invalidos,
    searchResults: datos.search_results ?? [],
    citations: datos.citations ?? [],
    llamada: { tarea: args.tarea, modelo: cfg.modelo, usage, costeUsd: costeEstimado(cfg, usage), ok: true },
  };
}
