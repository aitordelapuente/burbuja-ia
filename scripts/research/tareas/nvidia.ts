// Tarea `nvidia` (I13-I16, I18): 8-K de resultados de Nvidia en EDGAR + regex de la sección 18.3.1.
// El LLM (modo extracción, sin búsqueda web) solo se usa si las regex no encuentran algún dato en el mismo documento.
import { SEC } from '@/lib/config';
import { htmlATexto, fraseAlrededor } from '../texto';
import { descargarSec, ficherosDeIndice, presentaciones, sinGuiones, urlDocumento } from '../sec';
import type { Aceptado, Propuesta } from '../tipos';
import { pasoLLM, propuestaDesdeLLM, type ContextoTarea, type Tarea } from './comun';

export type CampoNvidia = 'ingresos_musd' | 'guidance_musd' | 'garantia_mayor_musd' | 'garantias_musd';

export interface DatoNvidia {
  campo: CampoNvidia;
  valorMusd: number;
  cita: string;
  crecInteranual?: number;
  trimestreTexto?: string;
}

const ORDINAL: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
const aMusd = (n: string, unidad = 'billion') => Math.round(Number(n.replace(/,/g, '')) * (unidad.toLowerCase() === 'million' ? 1 : 1000) * 10) / 10;

/** Regex de la sección 18.3.1 sobre el texto plano del CFO commentary o de la nota de prensa. */
export function extraerNvidia(texto: string): DatoNvidia[] {
  const out: DatoNvidia[] = [];
  const t = texto.replace(/[ \t]+/g, ' ');
  const cita = (m: RegExpExecArray) => fraseAlrededor(t, m.index, m.index + m[0].length);
  const ing = /Revenue for the (first|second|third|fourth) quarter was (?:a record )?\$([\d.,]+) billion, up (\d+)% from a year ago/i.exec(t);
  if (ing)
    out.push({ campo: 'ingresos_musd', valorMusd: aMusd(ing[2]), crecInteranual: Number(ing[3]) / 100, trimestreTexto: ing[1].toLowerCase(), cita: cita(ing) });
  const prev = /Revenue is expected to be \$([\d.,]+) billion/i.exec(t);
  if (prev) out.push({ campo: 'guidance_musd', valorMusd: aMusd(prev[1]), cita: cita(prev) });
  const gar = /up to a maximum of \$([\d.,]+) billion/i.exec(t);
  if (gar) out.push({ campo: 'garantia_mayor_musd', valorMusd: aMusd(gar[1]), cita: cita(gar) });
  const tabla = /maximum gross exposure related to (?:our )?guarantees[^$]{0,120}\$\s?([\d.,]+)\s*(billion|million)/i.exec(t);
  if (tabla) out.push({ campo: 'garantias_musd', valorMusd: aMusd(tabla[1], tabla[2]), cita: cita(tabla) });
  return out;
}

/** Trimestre fiscal «FY2027Q3»: del nombre del documento (q3fy27…) o, si no, de la fecha del 8-K y el ordinal. */
export function trimestreFiscal(documento: string, fecha8k: string, ordinal?: string): string | null {
  const m = /q([1-4])fy(\d{2})/i.exec(documento);
  if (m) return `FY20${m[2]}Q${m[1]}`;
  const q = ordinal ? ORDINAL[ordinal] : undefined;
  if (!q) return null;
  const anio = Number(fecha8k.slice(0, 4));
  // El año fiscal de Nvidia termina a finales de enero: el Q4 se publica en febrero del propio año fiscal.
  return `FY${q === 4 ? anio : anio + 1}Q${q}`;
}

export const siguienteTrimestre = (t: string) => {
  const m = /^FY(\d{4})Q([1-4])$/.exec(t);
  if (!m) return null;
  const q = Number(m[2]);
  return q === 4 ? `FY${Number(m[1]) + 1}Q1` : `FY${m[1]}Q${q + 1}`;
};

/** Último valor conocido de un campo en nvidia.json (admite items {campo, valor} y la semilla {ingresos_musd: …}). */
export function ultimoValor(items: Array<Record<string, unknown>>, campo: CampoNvidia, excluirTrimestre?: string): number | null {
  const candidatos = items
    .filter((i) => i.trimestre !== excluirTrimestre)
    .map((i) => ({ t: String(i.trimestre ?? ''), v: i.campo === campo ? i.valor : i[campo] }))
    .filter((x): x is { t: string; v: number } => typeof x.v === 'number')
    .sort((a, b) => a.t.localeCompare(b.t));
  return candidatos.length ? candidatos[candidatos.length - 1].v : null;
}

const TIPO_RANGO: Record<CampoNvidia, Propuesta['tipoRango']> = {
  ingresos_musd: 'ingresos_nvda',
  guidance_musd: 'prevision_nvda',
  garantia_mayor_musd: 'garantias_nvda',
  garantias_musd: 'garantias_nvda',
};

export function propuestasNvidia(args: {
  datos: DatoNvidia[];
  trimestre: string;
  url: string;
  textoPagina: string;
  fecha: string;
  existentes: Array<Record<string, unknown>>;
  modelo: string;
}): Propuesta[] {
  const { datos, trimestre, url, textoPagina, fecha, existentes } = args;
  const ingresos = datos.find((d) => d.campo === 'ingresos_musd')?.valorMusd ?? ultimoValor(existentes, 'ingresos_musd');
  return datos.map((d) => {
    const referencia =
      d.campo === 'guidance_musd' ? ingresos : d.campo === 'ingresos_musd' ? ultimoValor(existentes, 'ingresos_musd', trimestre) : ultimoValor(existentes, d.campo);
    const item: Record<string, unknown> = { trimestre, campo: d.campo, valor: d.valorMusd };
    if (d.campo === 'ingresos_musd' && d.crecInteranual !== undefined) item.crec_interanual = d.crecInteranual;
    if (d.campo === 'guidance_musd') item.trimestre_previsto = siguienteTrimestre(trimestre);
    return {
      tarea: 'nvidia',
      fichero: 'nvidia',
      item,
      fuente_url: url,
      cita: d.cita,
      fecha_dato: fecha,
      fecha_publicacion: fecha,
      tipo_fuente: 'primaria',
      valor: d.valorMusd,
      tipoRango: TIPO_RANGO[d.campo],
      referencia,
      textoPagina,
      claveDup: `nvidia|${trimestre}|${d.campo}`,
      modelo: args.modelo,
    } satisfies Propuesta;
  });
}

/**
 * Une los campos verificados de un mismo trimestre en un solo item con la forma de NvidiaSchema
 * (data/manual/nvidia.json). Cada campo se ha verificado por separado con su propia cita (`citas`).
 */
export function fusionarNvidia(aceptados: Aceptado[]): Aceptado[] {
  const porTrimestre = new Map<string, Aceptado[]>();
  for (const a of aceptados) {
    const t = String(a.item.trimestre);
    porTrimestre.set(t, [...(porTrimestre.get(t) ?? []), a]);
  }
  const out: Aceptado[] = [];
  for (const [trimestre, lista] of porTrimestre) {
    const v = (c: CampoNvidia) => (lista.find((a) => a.item.campo === c)?.item.valor as number | undefined) ?? null;
    const ing = lista.find((a) => a.item.campo === 'ingresos_musd');
    const principal = ing ?? lista[0];
    const item: Record<string, unknown> = {
      trimestre,
      fecha_dato: principal.fecha_dato,
      ingresos_musd: v('ingresos_musd'),
      crec_interanual: (ing?.item.crec_interanual as number | undefined) ?? null,
    };
    for (const c of ['guidance_musd', 'garantias_musd', 'garantia_mayor_musd'] as CampoNvidia[]) if (v(c) !== null) item[c] = v(c);
    const prev = lista.find((a) => a.item.campo === 'guidance_musd')?.item.trimestre_previsto;
    if (prev) item.trimestre_previsto = prev;
    item.fuente = `SEC 8-K, ${principal.fuente_url.split('/').pop()}`;
    item.citas = Object.fromEntries(lista.map((a) => [String(a.item.campo), a.cita]));
    const motivos = lista.flatMap((a) => a.motivosRevision.map((m) => `${String(a.item.campo)}: ${m}`));
    out.push({
      ...principal,
      item,
      claveDup: `nvidia|${trimestre}`,
      duplicaA: (e) => e.trimestre === trimestre && e.origen === 'J2',
      cita_verificada: lista.every((a) => a.cita_verificada === 'pagina') ? 'pagina' : 'snippet',
      requiere_revision: motivos.length > 0,
      motivosRevision: motivos,
      fuentesAdicionales: lista.filter((a) => a !== principal && a.fuente_url !== principal.fuente_url).map((a) => ({ fuente_url: a.fuente_url, cita: a.cita, cita_verificada: a.cita_verificada })),
    });
  }
  return out;
}

export const tareaNvidia: Tarea = {
  nombre: 'nvidia',
  descripcion: 'ingresos del trimestre, previsión del siguiente trimestre y garantías de Nvidia en su 8-K de resultados',
  unidad: 'millones de USD',
  recencia: 'week',
  dias: 120,
  async ejecutar(ctx: ContextoTarea) {
    const notas: string[] = [];
    const sub = await presentaciones(SEC.cikNvda);
    if (!sub.ok) return { propuestas: [], notas: [`EDGAR submissions de NVDA no responde: ${sub.error}`] };
    const ochoK = sub.lista.find((p) => p.form === '8-K' && p.items.includes('2.02'));
    if (!ochoK) return { propuestas: [], notas: ['no hay 8-K de resultados (Item 2.02) reciente'] };
    const existentes = ctx.existentes('nvidia');
    const acc = sinGuiones(ochoK.accessionNumber);
    if (existentes.some((e) => typeof e.fuente_url === 'string' && e.fuente_url.includes(acc) && e.origen === 'J2')) {
      return { propuestas: [], notas: [`8-K ${ochoK.accessionNumber} ya procesado`] };
    }
    const ficheros = await ficherosDeIndice(SEC.cikNvda, ochoK.accessionNumber);
    const docs = [...ficheros.filter((f) => /cfocommentary.*\.htm$/i.test(f)), ...ficheros.filter((f) => /pr\.htm$/i.test(f))];
    if (!docs.length) return { propuestas: [], notas: [`8-K ${ochoK.accessionNumber} sin cfocommentary ni pr.htm`] };
    const propuestas: Propuesta[] = [];
    const vistos = new Set<string>();
    const documentos: Array<{ url: string; texto: string; doc: string }> = [];
    for (const doc of docs) {
      const url = urlDocumento(SEC.cikNvda, ochoK.accessionNumber, doc);
      const r = await descargarSec(url);
      if (!r.ok) {
        notas.push(`${doc}: HTTP ${r.status}`);
        continue;
      }
      const texto = htmlATexto(r.texto);
      documentos.push({ url, texto, doc });
      const datos = extraerNvidia(texto).filter((d) => !vistos.has(d.campo));
      datos.forEach((d) => vistos.add(d.campo));
      const trimestre = trimestreFiscal(doc, ochoK.filingDate, datos.find((d) => d.trimestreTexto)?.trimestreTexto);
      if (!trimestre) {
        notas.push(`${doc}: no se puede derivar el trimestre fiscal`);
        continue;
      }
      propuestas.push(
        ...propuestasNvidia({ datos, trimestre, url, textoPagina: texto, fecha: ochoK.reportDate || ochoK.filingDate, existentes, modelo: 'determinista' }),
      );
    }
    const faltan = (['ingresos_musd', 'guidance_musd', 'garantia_mayor_musd'] as CampoNvidia[]).filter((c) => !vistos.has(c));
    if (faltan.length && documentos.length && ctx.llm) {
      notas.push(`regex sin resultado para ${faltan.join(', ')}: se pide al LLM que extraiga del mismo documento`);
      const { items, snippets } = await pasoLLM(ctx, { ...tareaNvidia, descripcion: `${faltan.join(', ')} de Nvidia (escribe en "detalle" el nombre exacto del campo)` }, {
        existentes,
        documentos: documentos.map((d) => ({ url: d.url, texto: d.texto })),
      });
      const doc0 = documentos[0];
      const trimestre = trimestreFiscal(doc0.doc, ochoK.filingDate) ?? 'desconocido';
      for (const i of items) {
        const campo = faltan.find((c) => i.detalle?.includes(c) || i.titulo.includes(c));
        if (!campo || typeof i.valor !== 'number') continue;
        const base = propuestasNvidia({
          datos: [{ campo, valorMusd: i.valor, cita: i.cita }],
          trimestre,
          url: i.fuente_url,
          textoPagina: documentos.find((d) => d.url === i.fuente_url)?.texto ?? '',
          fecha: i.fecha_dato,
          existentes,
          modelo: ctx.llm.modelo,
        })[0];
        propuestas.push({ ...propuestaDesdeLLM(ctx, 'nvidia', 'nvidia', i, snippets, base.item), ...base, modelo: ctx.llm.modelo });
      }
    }
    return { propuestas, notas };
  },
  postVerificacion: fusionarNvidia,
};
