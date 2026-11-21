// Tarea `eventos` (c5/c6): EDGAR de Anthropic (8-K Items 1.03/2.01/5.01), GDELT opcional y LLM.
// Ajuste de seguridad: todo lo que sale de aquí va a un PR `revision-humana` (+ `suceso`); las reglas A/B solo etiquetan.
import { DOMINIOS_PERMITIDOS, SEC } from '@/lib/config';
import { dominioPermitido, pedir } from '../../lib/http';
import { accionPRC56, reglaA, reglaB, type EventoC56 } from '../clasificar';
import { descargarSec, presentaciones, urlDocumento, sinGuiones } from '../sec';
import { fraseAlrededor, htmlATexto } from '../texto';
import type { Aceptado, Propuesta } from '../tipos';
import { idSeguro, pasoLLM, propuestaDesdeLLM, type ContextoTarea, type Tarea } from './comun';

export const URL_GDELT =
  'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
  encodeURIComponent('("OpenAI" OR "Anthropic") (bankruptcy OR "chapter 11" OR acquired OR acquisition)') +
  '&mode=artlist&format=json&timespan=2d&maxrecords=50';

const ITEMS_ANT: Record<string, { tipo: string; titulo: string }> = {
  '1.03': { tipo: 'quiebra', titulo: 'Anthropic presenta un 8-K con Item 1.03 (Bankruptcy or Receivership)' },
  '2.01': { tipo: 'otro', titulo: 'Anthropic presenta un 8-K con Item 2.01 (adquisición completada); no cuenta para c6' },
  '5.01': { tipo: 'otro', titulo: 'Anthropic presenta un 8-K con Item 5.01 (cambio de control); no cuenta para c6' },
};

/** Propuestas deterministas a partir de los 8-K de Anthropic. */
export async function propuestasEdgarAnt(ctx: ContextoTarea): Promise<{ propuestas: Propuesta[]; notas: string[] }> {
  const sub = await presentaciones(SEC.cikAnthropic);
  if (!sub.ok) return { propuestas: [], notas: [`EDGAR de ANT no responde: ${sub.error}`] };
  const propuestas: Propuesta[] = [];
  for (const p of sub.lista.filter((x) => x.form.startsWith('8-K') && x.filingDate >= ctx.desde)) {
    const item = p.items.find((i) => ITEMS_ANT[i]);
    if (!item) continue;
    const url = urlDocumento(SEC.cikAnthropic, p.accessionNumber, p.primaryDocument);
    const r = await descargarSec(url);
    if (!r.ok) {
      ctx.descartes.push({ tarea: 'eventos', fuente_url: url, motivo: `url_no_viva: HTTP ${r.status}` });
      continue;
    }
    const texto = htmlATexto(r.texto);
    const m = new RegExp(`Item ${item.replace('.', '\\.')}[^.]{0,200}`, 'i').exec(texto);
    if (!m) {
      ctx.descartes.push({ tarea: 'eventos', fuente_url: url, motivo: `el documento no contiene «Item ${item}»` });
      continue;
    }
    const def = ITEMS_ANT[item];
    propuestas.push({
      tarea: 'eventos',
      fichero: 'eventos',
      item: { id: `ant-8k-${sinGuiones(p.accessionNumber)}`, fecha: p.filingDate, tipo: def.tipo, entidad: 'Anthropic', titulo: def.titulo },
      fuente_url: url,
      cita: fraseAlrededor(texto, m.index, m.index + m[0].length),
      fecha_dato: p.filingDate,
      fecha_publicacion: p.filingDate,
      tipo_fuente: 'primaria',
      valor: null,
      textoPagina: texto,
      grupoFecha: `Anthropic|${def.tipo}`,
      modelo: 'determinista',
    });
  }
  return { propuestas, notas: [] };
}

/** GDELT es opcional: si no devuelve JSON, se reintenta una vez a los 10 s y luego se sigue sin él. */
export async function articulosGdelt(ctx: ContextoTarea): Promise<Array<{ url: string; title: string; seendate?: string }>> {
  for (let intento = 0; intento < 2; intento++) {
    const r = await pedir(URL_GDELT, { reintentos: 0 });
    if (r.ok) {
      try {
        const j = JSON.parse(r.texto) as { articles?: Array<{ url: string; title: string; seendate?: string }> };
        return (j.articles ?? []).filter((a) => dominioPermitido(a.url, DOMINIOS_PERMITIDOS));
      } catch {
        ctx.log('[research] GDELT no ha devuelto JSON (probable aviso de límite de uso)');
      }
    }
    if (intento === 0) await ctx.dormir(10_000);
  }
  ctx.log('[research] GDELT no disponible: se continúa con EDGAR y el LLM');
  return [];
}

export const tareaEventos: Tarea = {
  nombre: 'eventos',
  descripcion:
    'quiebra, concurso de acreedores, chapter 11 o administración judicial de OpenAI o de Anthropic; adquisición o toma de control de OpenAI por otra empresa',
  unidad: 'sin cifra (valor: null); entidad: "OpenAI" | "Anthropic"; tipo: "quiebra" | "adquisicion_openai" | "otro"',
  recencia: 'week',
  dias: 7,
  async ejecutar(ctx) {
    const { propuestas, notas } = await propuestasEdgarAnt(ctx);
    const existentes = ctx.existentes('eventos');
    if (ctx.llm) {
      let documentos: Array<{ url: string; texto: string }> | undefined;
      if (!ctx.llm.buscaEnWeb) {
        // Sin búsqueda web: el código descarga los artículos de GDELT y el LLM solo extrae de ellos.
        documentos = [];
        for (const a of (await articulosGdelt(ctx)).slice(0, 8)) {
          const r = await pedir(a.url);
          if (r.ok) documentos.push({ url: a.url, texto: htmlATexto(r.texto).slice(0, 20_000) });
        }
      }
      const { items, snippets } = await pasoLLM(ctx, tareaEventos, { existentes, documentos });
      for (const i of items) {
        if (i.entidad !== 'OpenAI' && i.entidad !== 'Anthropic') continue;
        const tipo = i.tipo ?? 'otro';
        propuestas.push(
          propuestaDesdeLLM(
            ctx,
            'eventos',
            'eventos',
            i,
            snippets,
            { id: `${idSeguro(i.entidad)}-${tipo}-${i.fecha_dato}-${idSeguro(i.titulo).slice(0, 20)}`, fecha: i.fecha_dato, tipo, entidad: i.entidad, titulo: i.titulo },
            { grupoFecha: `${i.entidad}|${tipo}` },
          ),
        );
      }
    } else notas.push('sin clave del LLM: solo EDGAR');
    return { propuestas, notas };
  },
  /**
   * Reglas A/B: lo que cumple una regla va a eventos.json con `regla` y `fuentes`; lo demás, a candidatos_c56.json.
   * En ambos casos el PR queda en `revision-humana` y nadie lo mergea salvo una persona.
   */
  postVerificacion(aceptados: Aceptado[], ctx: ContextoTarea) {
    const out: Aceptado[] = [];
    const comoEvento = (a: Aceptado): EventoC56 => ({
      entidad: String(a.item.entidad),
      tipo: String(a.item.tipo),
      fuente_url: a.fuente_url,
      cita: a.cita,
      cita_verificada: a.cita_verificada,
      tipo_fuente: a.tipo_fuente,
      fecha_publicacion: a.fecha_publicacion,
      fecha_dato: a.fecha_dato,
      es_rumor: a.es_rumor,
      es_desmentido: a.es_desmentido,
    });
    const todos = aceptados.map(comoEvento);
    const grupos = new Map<string, Aceptado[]>();
    for (const a of aceptados) {
      const ra = reglaA(comoEvento(a));
      if (ra.cumple || a.item.tipo === 'otro') {
        out.push({ ...a, item: { ...a.item, verificado: true, ...(ra.cumple ? { regla: 'A' } : {}), nota_regla: accionPRC56(ra).comentario } });
        continue;
      }
      const k = `${String(a.item.entidad)}|${String(a.item.tipo)}`;
      grupos.set(k, [...(grupos.get(k) ?? []), a]);
    }
    for (const [k, grupo] of grupos) {
      const rb = reglaB(grupo.map(comoEvento), todos);
      const fuentes = grupo.map((g) => ({ fuente_url: g.fuente_url, cita: g.cita, cita_verificada: g.cita_verificada, fecha_publicacion: g.fecha_publicacion ?? null }));
      const primero = grupo[0];
      if (rb.cumple) {
        out.push({ ...primero, item: { ...primero.item, verificado: true, regla: 'B', fuentes, nota_regla: accionPRC56(rb).comentario } });
      } else {
        ctx.log(`[research] ${k}: ${rb.motivo} → candidatos_c56`);
        out.push({
          ...primero,
          fichero: 'candidatos_c56',
          item: {
            id: `cand-${String(primero.item.id)}`,
            condicion: primero.item.tipo === 'quiebra' ? 'c5' : 'c6',
            entidad: primero.item.entidad,
            tipo: primero.item.tipo,
            titulo: primero.item.titulo,
            fecha: primero.item.fecha,
            fuentes,
            motivo: rb.motivo,
          },
        });
      }
    }
    return out;
  },
};
