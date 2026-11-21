// Tarea `regulacion` (I34): Federal Register API (determinista) + clasificación por LLM en modo extracción.
import { addDays } from '@/lib/calc/fechas';
import { pedirJson } from '../../lib/http';
import type { Propuesta } from '../tipos';
import { pasoLLM, propuestaDesdeLLM, type ContextoTarea, type Tarea } from './comun';

export interface DocumentoFR {
  title: string;
  abstract?: string | null;
  html_url: string;
  publication_date: string;
  type?: string;
  document_number?: string;
  agencies?: Array<{ name?: string; slug?: string }>;
}

export function urlFederalRegister(desde: string) {
  const q = new URLSearchParams();
  q.set('conditions[term]', '"data center" | "artificial intelligence" | semiconductor');
  q.set('order', 'newest');
  q.set('per_page', '50');
  q.set('conditions[publication_date][gte]', desde);
  return `https://www.federalregister.gov/api/v1/documents.json?${q}`;
}

/**
 * Regla determinista conservadora: normas de BIS (Industry and Security) sobre exportación de chips.
 * La gravedad la asigna una regla, así que el item siempre va a revisión humana.
 */
export function esControlExportacion(d: DocumentoFR): boolean {
  const bis = (d.agencies ?? []).some((a) => /industry and security/i.test(a.name ?? '') || a.slug === 'industry-and-security-bureau');
  return bis && /export/i.test(d.title) && /(semiconductor|advanced computing|integrated circuit|chip)/i.test(d.title);
}

export const tareaRegulacion: Tarea = {
  nombre: 'regulacion',
  descripcion:
    'normas, órdenes ejecutivas, leyes o anuncios oficiales de EE. UU. o la UE que frenen, graven o restrinjan centros de datos de IA o la exportación de chips',
  unidad: 'sin cifra (valor: null); gravedad 1-3; efecto: freno_cpd | exportacion | investigacion | otro; ambito: EEUU | UE | otro',
  recencia: 'week',
  dias: 7,
  async ejecutar(ctx: ContextoTarea) {
    const notas: string[] = [];
    const propuestas: Propuesta[] = [];
    const r = await pedirJson<{ results?: DocumentoFR[] }>(urlFederalRegister(addDays(ctx.hoy, -2)));
    const docs = r.ok ? (r.data.results ?? []) : [];
    if (!r.ok) notas.push(`Federal Register no responde: ${r.error}`);
    for (const d of docs.filter(esControlExportacion)) {
      propuestas.push({
        tarea: 'regulacion',
        fichero: 'regulacion',
        item: {
          id: `fr-${d.document_number ?? d.publication_date}`,
          fecha: d.publication_date,
          ambito: 'EEUU',
          titulo: d.title,
          efecto: 'exportacion',
          gravedad: 2,
        },
        fuente_url: d.html_url,
        cita: d.title,
        fecha_dato: d.publication_date,
        fecha_publicacion: d.publication_date,
        tipo_fuente: 'primaria',
        valor: null,
        valorRango: 2,
        tipoRango: 'gravedad',
        modelo: 'determinista',
        revisionForzada: 'gravedad asignada por regla determinista (BIS + exportación de chips)',
      });
    }
    const resto = docs.filter((d) => !esControlExportacion(d));
    if (ctx.llm && (resto.length || ctx.llm.buscaEnWeb)) {
      // Se pasan los títulos y resúmenes; la cita se verifica después contra la página html_url.
      const documentos = ctx.llm.buscaEnWeb
        ? undefined
        : resto.slice(0, 30).map((d) => ({ url: d.html_url, texto: `${d.title}. ${d.abstract ?? ''} (${d.publication_date}; ${(d.agencies ?? []).map((a) => a.name).join(', ')})` }));
      const { items, snippets } = await pasoLLM(ctx, tareaRegulacion, { existentes: ctx.existentes('regulacion'), documentos });
      for (const i of items) {
        if (!i.gravedad) continue;
        propuestas.push(
          propuestaDesdeLLM(
            ctx,
            'regulacion',
            'regulacion',
            i,
            snippets,
            { id: `reg-${i.fecha_dato}-${i.titulo.slice(0, 30)}`.replace(/[^a-zA-Z0-9-]+/g, '-'), fecha: i.fecha_dato, ambito: i.ambito ?? 'otro', titulo: i.titulo, efecto: i.efecto ?? 'otro', gravedad: i.gravedad },
            { valor: null, valorRango: i.gravedad, tipoRango: 'gravedad' },
          ),
        );
      }
    } else if (!ctx.llm) notas.push(`sin clave del LLM: ${resto.length} documentos del Federal Register sin clasificar`);
    return { propuestas, notas };
  },
};
