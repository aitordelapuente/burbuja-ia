// Clasificación del PR (18.3.5) y reglas A/B de c5/c6 (18.3.6), con el ajuste de seguridad del equipo:
// - ningún bot aprueba ni mergea PR que requieren revisión;
// - los PR de c5/c6 SIEMPRE quedan en `revision-humana`: las reglas A y B solo etiquetan y comentan;
// - el único automerge es el nativo de GitHub tras CI verde, para PR de datos de bajo riesgo que cumplan TODO lo de 18.3.5.
import { DOMINIOS_PERMITIDOS } from '@/lib/config';
import { dominioPermitido } from '../lib/http';
import { normalizar } from './texto';
import type { Aceptado } from './tipos';

export type Etiqueta = 'automerge' | 'revision-humana' | 'suceso';

/** Tipos de evento que activarían c5/c6. */
export const TIPOS_C56 = new Set(['quiebra', 'adquisicion_openai']);

/** Ficheros cuyos cambios SIEMPRE requieren revisión humana (c5/c6 y sus candidatos). */
export const FICHEROS_SIEMPRE_REVISION = new Set(['eventos', 'candidatos_c56']);

export interface CambioFichero {
  fichero: string;
  antes: unknown[];
  despues: unknown[];
}

/** true si `despues` solo añade items al final de `antes` (no borra ni modifica ninguno). */
export function soloAltas(antes: unknown[], despues: unknown[]): boolean {
  if (despues.length < antes.length) return false;
  return antes.every((a, i) => JSON.stringify(a) === JSON.stringify(despues[i]));
}

export function esC56(a: Pick<Aceptado, 'fichero' | 'item'>): boolean {
  return FICHEROS_SIEMPRE_REVISION.has(a.fichero) || TIPOS_C56.has(String(a.item.tipo ?? ''));
}

export function clasificarPR(aceptados: Aceptado[], cambios: CambioFichero[]): { etiquetas: Etiqueta[]; motivos: string[] } {
  const motivos: string[] = [];
  for (const c of cambios) if (!soloAltas(c.antes, c.despues)) motivos.push(`${c.fichero}: se borra o modifica un item existente`);
  for (const a of aceptados) {
    const nombre = `${a.fichero}:${String(a.item.id ?? a.item.titulo ?? a.fuente_url)}`;
    if (a.cita_verificada !== 'pagina' || a.fuentesAdicionales?.some((f) => f.cita_verificada !== 'pagina'))
      motivos.push(`${nombre}: cita verificada solo en snippet`);
    if (a.requiere_revision) motivos.push(`${nombre}: ${a.motivosRevision.join('; ') || 'requiere revisión'}`);
    if (TIPOS_C56.has(String(a.item.tipo ?? ''))) motivos.push(`${nombre}: evento de tipo ${String(a.item.tipo)} (c5/c6)`);
    if (FICHEROS_SIEMPRE_REVISION.has(a.fichero)) motivos.push(`${nombre}: fichero ${a.fichero} (c5/c6) siempre en revisión`);
    if (a.fichero === 'laboratorios' && (a.item.estado === 'tension' || a.item.estado === 'evento'))
      motivos.push(`${nombre}: cambia el estado de un laboratorio a ${String(a.item.estado)}`);
    if (a.item.gravedad === 3) motivos.push(`${nombre}: gravedad 3`);
  }
  const etiquetas: Etiqueta[] = motivos.length ? ['revision-humana'] : ['automerge'];
  if (aceptados.some(esC56)) etiquetas.push('suceso');
  return { etiquetas, motivos: [...new Set(motivos)] };
}

// ---------- Reglas de activación (solo informativas: etiquetan y comentan) ----------

/** Registros judiciales públicos admitidos por la regla A. */
export const REGISTROS_JUDICIALES = ['restructuring.ra.kroll.com', 'cases.stretto.com', 'dm.epiq11.com', 'omniagentsolutions.com'];

export interface EventoC56 {
  entidad: string;
  tipo: string;
  fuente_url: string;
  cita: string;
  cita_verificada: 'pagina' | 'snippet';
  tipo_fuente?: string;
  fecha_publicacion?: string | null;
  fecha_dato: string;
  es_rumor?: boolean;
  es_desmentido?: boolean;
}

export interface ResultadoRegla {
  cumple: boolean;
  regla: 'A' | 'B' | null;
  condicion: 'c5' | 'c6' | null;
  motivo: string;
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/** Regla A, fuente primaria (18.3.6). */
export function reglaA(e: EventoC56): ResultadoRegla {
  const no = (motivo: string): ResultadoRegla => ({ cumple: false, regla: null, condicion: null, motivo });
  if (e.cita_verificada !== 'pagina') return no('cita no verificada en página');
  const h = host(e.fuente_url);
  const c = normalizar(e.cita);
  if (e.entidad === 'Anthropic' && (h === 'sec.gov' || h.endsWith('.sec.gov'))) {
    if (/item 1\.03/.test(c)) return { cumple: true, regla: 'A', condicion: 'c5', motivo: '8-K de Anthropic con Item 1.03 (Bankruptcy or Receivership)' };
    if (/item (2\.01|5\.01)/.test(c)) return no('8-K de Anthropic con Item 2.01/5.01: se registra, pero c6 es solo OpenAI');
    return no('8-K de Anthropic sin Item 1.03');
  }
  if (e.entidad === 'OpenAI') {
    const esOpenai = h === 'openai.com' || h.endsWith('.openai.com');
    const esRegistro = REGISTROS_JUDICIALES.some((r) => h === r || h.endsWith(`.${r}`));
    if (esOpenai || esRegistro) {
      if (/chapter 11|bankruptcy/.test(c)) return { cumple: true, regla: 'A', condicion: 'c5', motivo: `${esOpenai ? 'comunicado de openai.com' : 'registro judicial'} con «Chapter 11»/«bankruptcy»` };
      if (esOpenai && /acquired by/.test(c)) return { cumple: true, regla: 'A', condicion: 'c6', motivo: 'comunicado de openai.com con «acquired by»' };
      return no('fuente primaria sin las expresiones exigidas');
    }
  }
  return no('no es una fuente primaria de la regla A');
}

const DESMENTIDO = /\bden(y|ies|ied)\b|not in talks|desmient|desmentid/;

/**
 * Regla B, consenso de medios (18.3.6): ≥ 3 medios distintos de la lista, con cita verificada en página,
 * publicados en ≤ 72 h, sin desmentidos en esas 72 h y sin rumores.
 */
export function reglaB(grupo: EventoC56[], todosEnVentana: EventoC56[] = grupo, horas = 72): ResultadoRegla {
  const no = (motivo: string): ResultadoRegla => ({ cumple: false, regla: null, condicion: null, motivo });
  if (grupo.length === 0) return no('sin items');
  const tipo = grupo[0].tipo;
  const condicion = tipo === 'quiebra' ? 'c5' : tipo === 'adquisicion_openai' ? 'c6' : null;
  if (!condicion) return no(`tipo ${tipo} no activa c5/c6`);
  if (grupo.some((g) => g.es_rumor)) return no('hay items marcados como rumor');
  const validos = grupo.filter((g) => g.cita_verificada === 'pagina' && dominioPermitido(g.fuente_url, DOMINIOS_PERMITIDOS));
  const fechas = validos.map((g) => Date.parse(g.fecha_publicacion ?? g.fecha_dato)).filter(Number.isFinite);
  if (fechas.length && (Math.max(...fechas) - Math.min(...fechas)) / 3_600_000 > horas) return no(`las publicaciones abarcan más de ${horas} h`);
  const desmentido = todosEnVentana.some((g) => g.entidad === grupo[0].entidad && (g.es_desmentido || DESMENTIDO.test(normalizar(g.cita))));
  if (desmentido) return no('hay un desmentido en la ventana de 72 h');
  const medios = new Set(validos.map((g) => dominioPermitido(g.fuente_url, DOMINIOS_PERMITIDOS)));
  if (medios.size < 3) return no(`solo ${medios.size} medio(s) permitidos con cita verificada en página`);
  return { cumple: true, regla: 'B', condicion, motivo: `${medios.size} medios permitidos en ≤ ${horas} h sin desmentidos` };
}

/**
 * Acción sobre un PR de c5/c6. Ajuste de seguridad: nunca se aprueba ni se mergea; se etiqueta y se comenta.
 * `C56_AUTOMERGE_TIMEOUT_H` queda fijado a 0 (no implementado): las horas transcurridas y la reconfirmación solo se anotan.
 */
export function accionPRC56(r: ResultadoRegla, estado: { horasAbierto?: number; reconfirmada?: boolean } = {}) {
  const lineas = [
    r.cumple ? `Regla ${r.regla} cumplida para ${r.condicion}: ${r.motivo}.` : `Ninguna regla cumplida: ${r.motivo}. Se trata como «Posible suceso en investigación».`,
  ];
  if (estado.horasAbierto !== undefined) lineas.push(`PR abierto hace ${Math.round(estado.horasAbierto)} h${estado.reconfirmada ? '; J2 ha reconfirmado la regla hoy' : ''}.`);
  lineas.push('Por política del equipo, ningún bot aprueba ni mergea este PR: necesita la revisión y el merge de una persona.');
  return { etiquetas: ['revision-humana', 'suceso'] as Etiqueta[], aprobar: false as const, merge: false as const, comentario: lineas.join(' ') };
}
