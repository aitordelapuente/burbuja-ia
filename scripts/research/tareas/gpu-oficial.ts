// Tarea `gpu_oficial` (c4 oficial, SDH100RT). Con SILICONDATA_API_KEY la app ya lee la API: J2 no hace nada.
// Sin clave: J2 lee una vez al día la página pública y extrae «As of {fecha} {valor} USD / GPU-hour» (regex; LLM de respaldo).
import { pedir } from '../../lib/http';
import { htmlATexto, fraseAlrededor } from '../texto';
import type { Propuesta } from '../tipos';
import { pasoLLM, propuestaDesdeLLM, type ContextoTarea, type Tarea } from './comun';

export const URL_SILICON_H100 = 'https://www.silicondata.com/products/silicon-index/h100';

const MESES: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

export function fechaInglesAIso(s: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  const m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})$/.exec(s);
  if (m && MESES[m[1].toLowerCase()]) return `${m[3]}-${MESES[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
  return null;
}

export function extraerSiliconData(texto: string): { fecha: string; valor: number; cita: string } | null {
  const m = /As of ([A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})[\s:,-]*\$?\s?([\d.]+)\s*USD\s*\/\s*GPU[- ]hour/i.exec(texto);
  if (!m) return null;
  const fecha = fechaInglesAIso(m[1]);
  if (!fecha) return null;
  return { fecha, valor: Number(m[2]), cita: fraseAlrededor(texto, m.index, m.index + m[0].length) };
}

export const tareaGpuOficial: Tarea = {
  nombre: 'gpu_oficial',
  descripcion: 'valor del índice Silicon Data H100 (SDH100RT) publicado en https://www.silicondata.com/products/silicon-index/h100, con la fecha "As of"',
  unidad: 'USD por GPU-hora',
  recencia: 'week',
  dias: 7,
  async ejecutar(ctx: ContextoTarea) {
    if (process.env.SILICONDATA_API_KEY) return { propuestas: [], notas: ['hay SILICONDATA_API_KEY: la app lee la API oficial'] };
    const r = await pedir(URL_SILICON_H100);
    if (!r.ok) return { propuestas: [], notas: [`página de Silicon Data: HTTP ${r.status || r.error}`] };
    const texto = htmlATexto(r.texto);
    const filas = ctx.existentes('gpu_alquiler');
    const previas = filas.filter((f) => String(f.gpu).toUpperCase() === 'H100' && String(f.indice) === 'SDH100RT' && f.usd_hora !== '' && f.fecha !== undefined).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    const referencia = previas.length ? Number(previas[previas.length - 1].usd_hora) : null;
    const base = (fecha: string, valor: number): Pick<Propuesta, 'item' | 'claveDup' | 'duplicaA' | 'tipoRango' | 'referencia'> => ({
      item: { fecha, gpu: 'h100', indice: 'SDH100RT', usd_hora: String(valor), fuente: URL_SILICON_H100, verificado: 'true' },
      claveDup: `gpu|H100|SDH100RT|${fecha}`,
      duplicaA: (e) => e.fecha === fecha && String(e.gpu).toUpperCase() === 'H100' && String(e.indice) === 'SDH100RT' && String(e.verificado) === 'true',
      tipoRango: 'h100',
      referencia,
    });
    const d = extraerSiliconData(texto);
    if (d) {
      return {
        propuestas: [
          { tarea: 'gpu_oficial', fichero: 'gpu_alquiler', fuente_url: URL_SILICON_H100, cita: d.cita, fecha_dato: d.fecha, tipo_fuente: 'primaria', valor: d.valor, textoPagina: texto, modelo: 'determinista', ...base(d.fecha, d.valor) },
        ],
        notas: [],
      };
    }
    const { items, snippets } = await pasoLLM(ctx, tareaGpuOficial, { existentes: filas, documentos: [{ url: URL_SILICON_H100, texto }] });
    const propuestas = items
      .filter((i) => typeof i.valor === 'number')
      .map((i) => ({ ...propuestaDesdeLLM(ctx, 'gpu_oficial', 'gpu_alquiler', i, snippets, {}), textoPagina: texto, ...base(i.fecha_dato, i.valor as number) }));
    return { propuestas, notas: propuestas.length ? [] : ['la página no contiene «As of … USD / GPU-hour» (¿exige JavaScript?)'] };
  },
};
