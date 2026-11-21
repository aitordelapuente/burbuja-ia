// Tareas `frentes_nvidia` (I17), `financiacion_labs` (I29) y `opv` (I32).
import { SEC } from '@/lib/config';
import { descargarSec, presentaciones, sinGuiones, urlDocumento } from '../sec';
import { fraseAlrededor, htmlATexto } from '../texto';
import type { Propuesta } from '../tipos';
import { idSeguro, pasoLLM, propuestaDesdeLLM, type ContextoTarea, type Tarea } from './comun';

export const tareaFrentesNvidia: Tarea = {
  nombre: 'frentes_nvidia',
  descripcion:
    'cambios en la dirección de Nvidia; investigaciones de la SEC u otros reguladores sobre Nvidia; cambios en la financiación o garantías de Nvidia a clientes (neoclouds, OpenAI)',
  unidad: 'sin cifra (valor: null); frente: direccion | regulacion | financiacion; gravedad 1-3',
  recencia: 'week',
  dias: 7,
  async ejecutar(ctx: ContextoTarea) {
    const propuestas: Propuesta[] = [];
    const notas: string[] = [];
    const sub = await presentaciones(SEC.cikNvda);
    if (!sub.ok) notas.push(`EDGAR de NVDA no responde: ${sub.error}`);
    const documentos: Array<{ url: string; texto: string }> = [];
    for (const p of sub.ok ? sub.lista.filter((x) => x.form.startsWith('8-K') && x.filingDate >= ctx.desde) : []) {
      const tiene502 = p.items.includes('5.02');
      if (!tiene502 && !p.items.includes('8.01')) continue;
      const url = urlDocumento(SEC.cikNvda, p.accessionNumber, p.primaryDocument);
      const r = await descargarSec(url);
      if (!r.ok) continue;
      const texto = htmlATexto(r.texto);
      documentos.push({ url, texto });
      const m = tiene502 ? /Item 5\.02[^.]{0,200}/i.exec(texto) : null;
      if (m) {
        propuestas.push({
          tarea: 'frentes_nvidia',
          fichero: 'frentes_nvidia',
          item: {
            id: `nvda-8k-${sinGuiones(p.accessionNumber)}`,
            fecha: p.filingDate,
            frente: 'direccion',
            titulo: 'Nvidia presenta un 8-K con Item 5.02 (salida o nombramiento de directivos o consejeros)',
            detalle: 'Detectado por J2 en EDGAR; la gravedad la fija una regla y debe revisarla una persona.',
            gravedad: 2,
          },
          fuente_url: url,
          cita: fraseAlrededor(texto, m.index, m.index + m[0].length),
          fecha_dato: p.filingDate,
          fecha_publicacion: p.filingDate,
          tipo_fuente: 'primaria',
          valor: null,
          valorRango: 2,
          tipoRango: 'gravedad',
          textoPagina: texto,
          modelo: 'determinista',
          revisionForzada: 'gravedad asignada por regla determinista (8-K Item 5.02)',
        });
      }
    }
    if (ctx.llm) {
      const { items, snippets } = await pasoLLM(ctx, tareaFrentesNvidia, {
        existentes: ctx.existentes('frentes_nvidia'),
        documentos: ctx.llm.buscaEnWeb ? undefined : documentos,
      });
      for (const i of items) {
        if (!i.frente || !i.gravedad) continue;
        propuestas.push(
          propuestaDesdeLLM(
            ctx,
            'frentes_nvidia',
            'frentes_nvidia',
            i,
            snippets,
            { id: `frente-${i.fecha_dato}-${idSeguro(i.titulo).slice(0, 24)}`, fecha: i.fecha_dato, frente: i.frente, titulo: i.titulo, detalle: i.detalle ?? '', gravedad: i.gravedad },
            { valor: null, valorRango: i.gravedad, tipoRango: 'gravedad' },
          ),
        );
      }
    }
    return { propuestas, notas };
  },
};

export const tareaFinanciacionLabs: Tarea = {
  nombre: 'financiacion_labs',
  descripcion: 'rondas, emisiones de deuda, OPV o líneas de crédito de OpenAI o Anthropic, con importe en millones de USD',
  unidad: 'millones de USD (valor = importe_musd)',
  recencia: 'month',
  dias: 14,
  async ejecutar(ctx: ContextoTarea) {
    const notas: string[] = [];
    const documentos: Array<{ url: string; texto: string }> = [];
    // Determinista: 8-K de Anthropic con Items 1.01 (acuerdo material) o 2.03 (obligación financiera). El importe lo extrae el LLM.
    const sub = await presentaciones(SEC.cikAnthropic);
    for (const p of sub.ok ? sub.lista.filter((x) => x.form.startsWith('8-K') && x.filingDate >= ctx.desde && (x.items.includes('1.01') || x.items.includes('2.03'))) : []) {
      const url = urlDocumento(SEC.cikAnthropic, p.accessionNumber, p.primaryDocument);
      const r = await descargarSec(url);
      if (r.ok) documentos.push({ url, texto: htmlATexto(r.texto) });
    }
    if (!ctx.llm) return { propuestas: [], notas: [`sin clave del LLM: ${documentos.length} 8-K de ANT sin extraer`] };
    const propuestas: Propuesta[] = [];
    const lotes: Array<Array<{ url: string; texto: string }> | undefined> = ctx.llm.buscaEnWeb ? [undefined] : [];
    if (documentos.length) lotes.push(documentos);
    for (const docs of lotes) {
      const { items, snippets } = await pasoLLM(ctx, tareaFinanciacionLabs, { existentes: ctx.existentes('financiacion_labs'), documentos: docs });
      for (const i of items) {
        if (i.entidad !== 'OpenAI' && i.entidad !== 'Anthropic') continue;
        propuestas.push(
          propuestaDesdeLLM(
            ctx,
            'financiacion_labs',
            'financiacion_labs',
            i,
            snippets,
            { id: `fin-${idSeguro(i.entidad)}-${i.fecha_dato}`, lab: i.entidad, fecha: i.fecha_dato, importe_musd: i.valor ?? null, tipo: i.tipo_financiacion ?? 'ronda', nota: i.titulo },
            { tipoRango: 'ronda', grupoFecha: `${i.entidad}|fin|${i.tipo_financiacion ?? 'ronda'}` },
          ),
        );
      }
    }
    if (!ctx.llm.buscaEnWeb) notas.push('proveedor sin búsqueda web: OpenAI (privada) no se cubre');
    return { propuestas, notas };
  },
};

export const tareaOpv: Tarea = {
  nombre: 'opv',
  descripcion: 'salidas a bolsa de empresas de IA o de infraestructura de IA, aplazadas o retiradas incluidas',
  unidad: 'millones de USD captados (valor), o null; indica "empresa" y "estado_opv" (completada | aplazada | retirada | prevista)',
  recencia: 'month',
  dias: 14,
  async ejecutar(ctx: ContextoTarea) {
    if (!ctx.llm?.buscaEnWeb) return { propuestas: [], notas: ['la tarea opv necesita un proveedor con búsqueda web'] };
    const { items, snippets } = await pasoLLM(ctx, tareaOpv, { existentes: ctx.existentes('opv') });
    const notas: string[] = [];
    const propuestas: Propuesta[] = [];
    for (const i of items) {
      if (!i.empresa || !i.estado_opv) {
        ctx.descartes.push({ tarea: 'opv', fuente_url: i.fuente_url, motivo: 'esquema: faltan empresa o estado_opv' });
        continue;
      }
      propuestas.push(
        propuestaDesdeLLM(
          ctx,
          'opv',
          'opv',
          i,
          snippets,
          { id: `opv-${idSeguro(i.empresa)}-${i.fecha_dato}`, empresa: i.empresa, fecha: i.fecha_dato, importe_musd: i.valor ?? null, estado: i.estado_opv },
          { tipoRango: i.valor ? 'ronda' : undefined, grupoFecha: `${i.empresa}|opv` },
        ),
      );
    }
    return { propuestas, notas };
  },
};
