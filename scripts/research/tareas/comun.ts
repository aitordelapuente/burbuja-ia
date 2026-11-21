// Contrato común de las tareas de J2 y paso LLM compartido.
import { DOMINIOS_PERMITIDOS } from '@/lib/config';
import { cargarPrompt, llamarLLM, rellenar, ESQUEMA_JSON, type ConfigLLM, type LlamadaLLM, type Presupuesto } from '../llm';
import type { Aceptado, Descarte, Fichero, ItemLLM, Propuesta } from '../tipos';

export interface ContextoTarea {
  hoy: string;
  desde: string;
  ahora: Date;
  llm: ConfigLLM | null;
  presupuesto: Presupuesto;
  existentes: (f: Fichero) => Array<Record<string, unknown>>;
  log: (m: string) => void;
  dormir: (ms: number) => Promise<void>;
  llamadas: LlamadaLLM[];
  descartes: Descarte[];
}

export interface ResultadoTarea {
  propuestas: Propuesta[];
  notas: string[];
}

export interface Tarea {
  nombre: string;
  descripcion: string;
  unidad: string;
  recencia: 'week' | 'month';
  /** Días hacia atrás de la ventana de búsqueda. */
  dias: number;
  ejecutar(ctx: ContextoTarea): Promise<ResultadoTarea>;
  /** Transformación tras la verificación (p. ej., reglas A/B de c5/c6). */
  postVerificacion?(aceptados: Aceptado[], ctx: ContextoTarea): Aceptado[] | Promise<Aceptado[]>;
}

export function resumenExistente(items: Array<Record<string, unknown>>, n = 10): string {
  const ult = items.slice(-n).map((i) => `${String(i.fecha ?? i.fecha_dato ?? i.trimestre ?? '')} ${String(i.titulo ?? i.campo ?? i.id ?? '')}`.trim());
  return ult.length ? ult.join(' | ') : 'ninguno';
}

/**
 * Paso LLM. Si `documentos` viene informado (o el proveedor no busca en la web), se usa el modo extracción:
 * el LLM solo puede citar el texto que le pasa el código. Devuelve [] si no hay clave, si el proveedor no busca en
 * la web y no hay documentos, o si el presupuesto diario está agotado.
 */
export async function pasoLLM(
  ctx: ContextoTarea,
  t: Pick<Tarea, 'nombre' | 'descripcion' | 'unidad' | 'recencia'>,
  args: { existentes: Array<Record<string, unknown>>; documentos?: Array<{ url: string; texto: string }> },
): Promise<{ items: ItemLLM[]; snippets: (url: string) => string[] }> {
  const nada = { items: [], snippets: () => [] };
  if (!ctx.llm) {
    ctx.log(`[research] ${t.nombre}: sin clave del LLM, se omite el paso LLM`);
    return nada;
  }
  const extraccion = args.documentos !== undefined || !ctx.llm.buscaEnWeb;
  if (extraccion && !args.documentos?.length) {
    ctx.log(`[research] ${t.nombre}: el proveedor no busca en la web y no hay documentos que pasarle`);
    return nada;
  }
  if (ctx.presupuesto.agotado) {
    ctx.log(`[research] ${t.nombre}: tope de gasto diario agotado, se omite el paso LLM`);
    return nada;
  }
  const plantillas = cargarPrompt();
  const valores = {
    tarea: t.nombre,
    desde: ctx.desde,
    hasta: ctx.hoy,
    descripcion_tarea: t.descripcion,
    unidad: t.unidad,
    dominios_permitidos: DOMINIOS_PERMITIDOS.join(', '),
    json_schema: JSON.stringify(ESQUEMA_JSON),
    resumen_existente: resumenExistente(args.existentes),
    documentos: (args.documentos ?? []).map((d) => `<documento url="${d.url}">\n${d.texto.slice(0, 60_000)}\n</documento>`).join('\n\n'),
  };
  const user = rellenar(extraccion ? plantillas.extraccion : plantillas.busqueda, valores);
  const r = await llamarLLM(ctx.llm, {
    tarea: t.nombre,
    system: 'Respondes solo con JSON válido. Nunca inventas datos ni URLs.',
    user,
    recencia: extraccion ? undefined : t.recencia,
  });
  ctx.llamadas.push(r.llamada);
  ctx.presupuesto.sumar(r.llamada.costeUsd);
  for (const inv of r.invalidos) ctx.descartes.push({ tarea: t.nombre, fuente_url: String((inv.bruto as { fuente_url?: string })?.fuente_url ?? ''), motivo: inv.motivo });
  if (!r.ok) ctx.log(`[research] ${t.nombre}: el LLM ha fallado (${r.error})`);
  let items = r.items;
  if (extraccion && args.documentos) {
    // En modo extracción solo valen las URL de los documentos que ha pasado el código.
    const urls = new Set(args.documentos.map((d) => d.url));
    items = items.filter((i) => {
      if (urls.has(i.fuente_url)) return true;
      ctx.descartes.push({ tarea: t.nombre, fuente_url: i.fuente_url, motivo: 'url_no_proporcionada: el LLM cita una URL que no se le pasó' });
      return false;
    });
  }
  const snippets = (url: string) => r.searchResults.filter((s) => s.url === url && s.snippet).map((s) => s.snippet as string);
  return { items, snippets };
}

/** Propuesta base a partir de un item del LLM. */
export function propuestaDesdeLLM(
  ctx: ContextoTarea,
  tarea: string,
  fichero: Fichero,
  i: ItemLLM,
  snippets: (u: string) => string[],
  item: Record<string, unknown>,
  extra: Partial<Propuesta> = {},
): Propuesta {
  return {
    tarea,
    fichero,
    item,
    fuente_url: i.fuente_url,
    cita: i.cita,
    fecha_dato: i.fecha_dato,
    fecha_publicacion: i.fecha_publicacion ?? null,
    tipo_fuente: i.tipo_fuente,
    es_rumor: i.es_rumor,
    es_desmentido: i.es_desmentido ?? false,
    valor: i.valor ?? null,
    snippets: snippets(i.fuente_url),
    modelo: ctx.llm?.modelo ?? 'llm',
    ...extra,
  };
}

export const idSeguro = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
