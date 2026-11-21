// J2 · Investigador de datos (sección 18.3).
// Uso: pnpm tsx scripts/research/run.ts --tareas=nvidia,eventos [--salida=DIR] [--hoy=YYYY-MM-DD] [--raiz=DIR]
// Orden: pasos deterministas → LLM (si hay clave) → verificación determinista → reglas c5/c6 → duplicados →
// escritura (solo altas) → clasificación del PR. Deja en --salida pr-body.md, labels.txt, hay-cambios.txt y pr-title.txt;
// el PR lo abre el workflow con peter-evans/create-pull-request@v7. Ningún paso aprueba ni mergea PR.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addDays } from '@/lib/calc/fechas';
import { abrirOComentar, clienteDesdeEntorno, enlaceRun, type ClienteGitHub } from '../lib/github';
import { dormirReal, type RespuestaHttp } from '../lib/http';
import { escribirFichero, escribirJson, escribirSalidaPR, leerArgs, leerCsv, leerJsonItems, serializarCsv, type FilaCsv, SALIDA_POR_DEFECTO } from '../lib/ficheros';
import { clasificarPR, type CambioFichero } from './clasificar';
import { configLLMDesdeEntorno, Presupuesto, type ConfigLLM, type LlamadaLLM } from './llm';
import { descubrir } from './polymarket-descubrir';
import { deduplicar, verificarPropuesta } from './verificar';
import { RUTAS, type Aceptado, type Descarte, type Fichero } from './tipos';
import type { ContextoTarea, Tarea } from './tareas/comun';
import { tareaNvidia } from './tareas/nvidia';
import { tareaEventos } from './tareas/eventos';
import { tareaRegulacion } from './tareas/regulacion';
import { tareaGpuOficial } from './tareas/gpu-oficial';
import { tareaFinanciacionLabs, tareaFrentesNvidia, tareaOpv } from './tareas/labs';

export const TAREAS: Record<string, Tarea> = {
  nvidia: tareaNvidia,
  eventos: tareaEventos,
  regulacion: tareaRegulacion,
  gpu_oficial: tareaGpuOficial,
  frentes_nvidia: tareaFrentesNvidia,
  financiacion_labs: tareaFinanciacionLabs,
  opv: tareaOpv,
};
export const TAREAS_DIARIAS = ['gpu_oficial', 'nvidia', 'eventos', 'frentes_nvidia', 'regulacion'];
export const TAREAS_SEMANALES = ['financiacion_labs', 'opv', 'polymarket'];

export const CABECERA_GPU = ['fecha', 'gpu', 'indice', 'usd_hora', 'fuente', 'verificado'];

export interface OpcionesJ2 {
  tareas: string[];
  raiz: string;
  salida: string;
  hoy: string;
  ahora?: Date;
  env?: Record<string, string | undefined>;
  dormir?: (ms: number) => Promise<void>;
  descargar?: (url: string) => Promise<RespuestaHttp>;
  gh?: ClienteGitHub | null;
  log?: (m: string) => void;
}

export interface ResultadoJ2 {
  hayPR: boolean;
  etiquetas: string[];
  motivos: string[];
  aceptados: Aceptado[];
  descartes: Descarte[];
  llamadas: LlamadaLLM[];
  costeUsd: number;
  notas: string[];
  cuerpo: string;
  llmActivo: boolean;
  presupuestoAgotado: boolean;
}

function leerExistentes(raiz: string, f: Fichero): Array<Record<string, unknown>> {
  const ruta = join(raiz, RUTAS[f]);
  if (f === 'gpu_alquiler') return leerCsv(ruta, CABECERA_GPU).filas;
  return leerJsonItems(ruta).items;
}

/** Campos comunes de J2 (sección 8). */
function itemFinal(a: Aceptado, hoy: string): Record<string, unknown> {
  return {
    ...a.item,
    fuente_url: a.fuente_url,
    cita: a.cita,
    cita_verificada: a.cita_verificada,
    verificado: true,
    origen: 'J2',
    modelo: a.modelo,
    fecha_alta: hoy,
    fecha_dato: a.fecha_dato,
    requiere_revision: a.requiere_revision,
    ...(a.fuentesAdicionales?.length ? { fuentes_adicionales: a.fuentesAdicionales } : {}),
  };
}

/** Escribe solo altas al final de cada fichero y devuelve los cambios (antes/después) para clasificar. */
function escribirAltas(raiz: string, aceptados: Aceptado[], hoy: string): CambioFichero[] {
  const cambios: CambioFichero[] = [];
  const porFichero = new Map<Fichero, Aceptado[]>();
  for (const a of aceptados) porFichero.set(a.fichero, [...(porFichero.get(a.fichero) ?? []), a]);
  for (const [f, lista] of porFichero) {
    const ruta = join(raiz, RUTAS[f]);
    if (f === 'gpu_alquiler') {
      const csv = leerCsv(ruta, CABECERA_GPU);
      const nuevas: FilaCsv[] = lista.map((a) => Object.fromEntries(csv.cabecera.map((c) => [c, String(a.item[c] ?? '')])));
      const despues = [...csv.filas, ...nuevas];
      escribirFichero(ruta, serializarCsv(csv.cabecera, despues));
      cambios.push({ fichero: f, antes: csv.filas, despues });
      continue;
    }
    const j = leerJsonItems(ruta, existsSync(ruta) ? '' : `Fichero ${f} alimentado por J2 (origen:"J2") y por personas.`);
    const despues = [...j.items, ...lista.map((a) => itemFinal(a, hoy))];
    escribirJson(ruta, { ...j, items: despues });
    cambios.push({ fichero: f, antes: j.items, despues });
  }
  return cambios;
}

const recortar = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const celda = (s: unknown) => recortar(String(s ?? '')).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Valores numéricos del item (p. ej. «ingresos_musd=115800 · guidance_musd=130000»). */
function resumenValor(a: Aceptado): string {
  const nums = Object.entries(a.item).filter(([k, v]) => typeof v === 'number' && k !== 'valor');
  if (nums.length) return nums.map(([k, v]) => `${k}=${String(v)}`).join(' · ');
  return String(a.valor ?? a.item.usd_hora ?? '—');
}

export function cuerpoPR(r: Omit<ResultadoJ2, 'cuerpo' | 'hayPR'>, tareas: string[], hoy: string, extra: string[]): string {
  const filas = r.aceptados.map(
    (a) =>
      `| ${a.fichero} | ${celda(a.item.campo ?? a.item.titulo ?? a.item.trimestre ?? a.item.id)} | ${celda(resumenValor(a))} | ${a.fuente_url} | «${celda(a.cita)}» | ${a.cita_verificada}${a.requiere_revision ? ` · revisión: ${celda(a.motivosRevision.join('; '))}` : ''} |`,
  );
  const citasPorCampo = r.aceptados
    .filter((a) => a.item.citas && typeof a.item.citas === 'object')
    .flatMap((a) => Object.entries(a.item.citas as Record<string, string>).map(([c, t]) => `- \`${c}\`: «${t}»`));
  const notasRegla = r.aceptados.map((a) => a.item.nota_regla).filter(Boolean);
  return [
    `## J2 · Investigador (${hoy}) — tareas: ${tareas.join(', ')}`,
    '',
    '| Fichero | Dato | Valor | URL | Cita | Verificación |',
    '|---|---|---|---|---|---|',
    ...filas,
    '',
    citasPorCampo.length ? `**Citas por campo:**\n${citasPorCampo.join('\n')}\n` : '',
    ...extra,
    notasRegla.length ? `### Reglas c5/c6\n\n${notasRegla.map((n) => `- ${String(n)}`).join('\n')}\n` : '',
    `**Clasificación:** \`${r.etiquetas.join(', ')}\`${r.motivos.length ? `\n\n${r.motivos.map((m) => `- ${m}`).join('\n')}` : ''}`,
    '',
    r.descartes.length ? `<details><summary>Descartados (${r.descartes.length})</summary>\n\n${r.descartes.map((d) => `- ${d.tarea}: ${d.motivo} — ${d.fuente_url}`).join('\n')}\n\n</details>\n` : '',
    `**Coste estimado del LLM:** ${r.costeUsd.toFixed(4)} USD en ${r.llamadas.length} llamada(s)${r.llmActivo ? '' : ' (modo reducido: sin clave del LLM)'}.`,
    r.notas.length ? `\n**Notas:**\n${r.notas.map((n) => `- ${n}`).join('\n')}` : '',
    '',
    'Política del equipo: ningún bot aprueba ni mergea PR en revisión. Solo los PR `automerge` usan el auto-merge nativo de GitHub cuando CI pasa.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

function costeYaGastado(raiz: string, hoy: string): number {
  const ruta = join(raiz, `logs/research/${hoy}.json`);
  if (!existsSync(ruta)) return 0;
  try {
    return Number((JSON.parse(readFileSync(ruta, 'utf8')) as { total_usd?: number }).total_usd ?? 0) || 0;
  } catch {
    return 0;
  }
}

export async function ejecutarJ2(o: OpcionesJ2): Promise<ResultadoJ2> {
  const env = o.env ?? process.env;
  const log = o.log ?? ((m: string) => console.log(m));
  const llm: ConfigLLM | null = configLLMDesdeEntorno(env);
  const previo = costeYaGastado(o.raiz, o.hoy);
  const presupuesto = new Presupuesto(llm?.maxUsdDia ?? 0, previo);
  const llamadas: LlamadaLLM[] = [];
  const descartes: Descarte[] = [];
  const notas: string[] = [];
  const extraCuerpo: string[] = [];
  const aceptadosTotales: Aceptado[] = [];
  const cambios: CambioFichero[] = [];
  const etiquetasExtra: string[] = [];
  if (!llm) notas.push('Sin RESEARCH_API_KEY/PERPLEXITY_API_KEY: los pasos LLM se omiten (modo reducido).');
  if (Number(env.C56_AUTOMERGE_TIMEOUT_H ?? 0) > 0) notas.push('C56_AUTOMERGE_TIMEOUT_H se ignora: por política del equipo está fijado a 0 (nunca se mergea solo).');

  for (const nombre of o.tareas) {
    if (nombre === 'polymarket') {
      const d = await descubrir({ raiz: o.raiz, hoy: o.hoy, gh: o.gh, log });
      if (d.hayCambios) {
        cambios.push({ fichero: 'polymarket_eventos', antes: d.antes, despues: d.despues });
        etiquetasExtra.push(...d.etiquetas);
        extraCuerpo.push(d.cuerpo, '');
      }
      continue;
    }
    const tarea = TAREAS[nombre];
    if (!tarea) {
      notas.push(`tarea desconocida: ${nombre}`);
      continue;
    }
    const ctx: ContextoTarea = {
      hoy: o.hoy,
      desde: addDays(o.hoy, -tarea.dias),
      ahora: o.ahora ?? new Date(),
      llm,
      presupuesto,
      existentes: (f) => leerExistentes(o.raiz, f),
      log,
      dormir: o.dormir ?? dormirReal,
      llamadas,
      descartes,
    };
    let res;
    try {
      res = await tarea.ejecutar(ctx);
    } catch (e) {
      notas.push(`${nombre}: error ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    notas.push(...res.notas.map((n) => `${nombre}: ${n}`));
    const verificados: Aceptado[] = [];
    for (const p of res.propuestas) {
      const v = await verificarPropuesta(p, { hoy: o.hoy, desde: ctx.desde, descargar: o.descargar });
      if (v.ok) verificados.push(v.aceptado);
      else descartes.push(v.descarte);
    }
    const tras = tarea.postVerificacion ? await tarea.postVerificacion(verificados, ctx) : verificados;
    const { unicos, duplicados } = deduplicar(tras, (f) => leerExistentes(o.raiz, f));
    descartes.push(...duplicados);
    cambios.push(...escribirAltas(o.raiz, unicos, o.hoy));
    aceptadosTotales.push(...unicos);
  }

  if (llm && presupuesto.agotado) {
    notas.push(`Tope de gasto diario alcanzado (${presupuesto.gastado.toFixed(2)} ≥ ${presupuesto.max} USD).`);
    if (o.gh) {
      await abrirOComentar(o.gh, {
        prefijo: '[monitor] research-presupuesto:',
        titulo: `[monitor] research-presupuesto: tope de gasto diario superado (${o.hoy})`,
        cuerpo: `J2 se ha detenido: coste estimado ${presupuesto.gastado.toFixed(2)} USD ≥ RESEARCH_MAX_USD_DIA (${presupuesto.max}).\n\nRun: ${enlaceRun(env)}`,
        etiquetas: ['monitor'],
      });
    }
  }

  const clas = clasificarPR(aceptadosTotales, cambios.filter((c) => c.fichero !== 'polymarket_eventos'));
  let etiquetas: string[] = clas.etiquetas;
  if (etiquetasExtra.includes('revision-humana')) etiquetas = ['revision-humana', ...etiquetas.filter((e) => e !== 'automerge' && e !== 'revision-humana')];
  const hayPR = cambios.some((c) => c.despues.length !== c.antes.length);
  const costeUsd = llamadas.reduce((s, l) => s + l.costeUsd, 0);
  const base = { etiquetas, motivos: clas.motivos, aceptados: aceptadosTotales, descartes, llamadas, costeUsd, notas, llmActivo: !!llm, presupuestoAgotado: !!llm && presupuesto.agotado };
  const cuerpo = cuerpoPR(base, o.tareas, o.hoy, extraCuerpo);
  if (hayPR) {
    escribirJson(join(o.raiz, `logs/research/${o.hoy}.json`), {
      fecha: o.hoy,
      total_usd: Math.round((previo + costeUsd) * 1e4) / 1e4,
      llamadas,
      descartes,
      notas,
    });
  }
  escribirSalidaPR(o.salida, { cuerpo, etiquetas, hayCambios: hayPR, titulo: `J2: ${o.tareas.join(', ')} (${o.hoy})` });
  for (const n of notas) log(`[research] ${n}`);
  return { ...base, hayPR, cuerpo };
}

async function principal() {
  const a = leerArgs();
  const hoy = a.hoy || new Date().toISOString().slice(0, 10);
  const lista = (a.tareas || 'diarias').split(',').flatMap((t) => (t === 'diarias' ? TAREAS_DIARIAS : t === 'semanales' ? TAREAS_SEMANALES : [t.trim()]));
  const r = await ejecutarJ2({ tareas: lista, raiz: a.raiz || process.cwd(), salida: a.salida || SALIDA_POR_DEFECTO, hoy, gh: clienteDesdeEntorno() });
  console.log(`[research] PR=${r.hayPR} etiquetas=${r.etiquetas.join(',')} aceptados=${r.aceptados.length} descartes=${r.descartes.length} coste=${r.costeUsd.toFixed(4)} USD`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    console.error('[research] error', e);
    process.exit(1);
  });
}
