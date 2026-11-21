// Verificación determinista de las propuestas (sección 18.3.4). El LLM nunca decide si un dato es válido.
import { pedir, type RespuestaHttp } from '../lib/http';
import { diffDays } from '@/lib/calc/fechas';
import { citaEnTexto, cifraEnCita, htmlATexto } from './texto';
import { FICHEROS_EVENTO, RANGOS, type Aceptado, type Descarte, type Propuesta } from './tipos';

export interface ContextoVerificacion {
  hoy: string;
  /** Inicio de la ventana pedida (fecha_dato ≥ desde). */
  desde?: string;
  /** Descarga de páginas (inyectable en tests; por defecto, pedir() con User-Agent de navegador). */
  descargar?: (url: string) => Promise<RespuestaHttp>;
}

/** Estados en los que la página existe pero no deja leer la cita (JS obligatorio o muro de pago). */
const ESTADOS_PAYWALL = new Set([200, 401, 402, 403]);

export async function verificarPropuesta(
  p: Propuesta,
  ctx: ContextoVerificacion,
): Promise<{ ok: true; aceptado: Aceptado } | { ok: false; descarte: Descarte }> {
  const descartar = (motivo: string) => ({ ok: false as const, descarte: { tarea: p.tarea, fuente_url: p.fuente_url, motivo, cita: p.cita } });
  // 1. Esquema mínimo común (el esquema zod del LLM ya se ha aplicado al parsear la respuesta).
  if (!/^https?:\/\//.test(p.fuente_url)) return descartar('esquema: fuente_url no es una URL http(s)');
  if (!p.cita || p.cita.trim().length < 10) return descartar('esquema: cita vacía o demasiado corta');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha_dato)) return descartar('esquema: fecha_dato no es YYYY-MM-DD');
  if (p.es_rumor) return descartar('es_rumor: no es un hecho');

  // 2. URL viva y 3. cita literal.
  let textoPagina = p.textoPagina;
  let estado = 200;
  if (textoPagina === undefined) {
    const r = await (ctx.descargar ?? ((u: string) => pedir(u)))(p.fuente_url);
    estado = r.status;
    if (r.ok) textoPagina = htmlATexto(r.texto);
    else if (!ESTADOS_PAYWALL.has(r.status)) return descartar(`url_no_viva: HTTP ${r.status || r.error}`);
  }
  let citaVerificada: 'pagina' | 'snippet' | null = null;
  if (textoPagina !== undefined && citaEnTexto(p.cita, textoPagina)) citaVerificada = 'pagina';
  else if (
    ESTADOS_PAYWALL.has(estado) &&
    (p.tipo_fuente === 'primaria' || p.tipo_fuente === 'medio') &&
    (p.snippets ?? []).some((s) => citaEnTexto(p.cita, s))
  )
    citaVerificada = 'snippet';
  if (!citaVerificada) return descartar('cita_no_encontrada: la cita literal no está en la página');

  // 4. Cifra dentro de la cita.
  if (p.valor !== null && p.valor !== undefined && !cifraEnCita(p.valor, p.cita)) return descartar(`cifra_ausente: ${p.valor} no aparece en la cita`);

  // 5. Fechas.
  if (p.fecha_dato > ctx.hoy) return descartar(`fecha_futura: ${p.fecha_dato} > ${ctx.hoy}`);
  if (ctx.desde && p.fecha_dato < ctx.desde) return descartar(`fuera_de_ventana: ${p.fecha_dato} < ${ctx.desde}`);

  // 7. Rango plausible y variación máxima → si no, requiere revisión (se escribe igual).
  const motivosRevision = comprobarRango(p);
  if (p.revisionForzada) motivosRevision.push(p.revisionForzada);
  return {
    ok: true,
    aceptado: { ...p, textoPagina: undefined, cita_verificada: citaVerificada, requiere_revision: motivosRevision.length > 0, motivosRevision },
  };
}

export function comprobarRango(p: Pick<Propuesta, 'tipoRango' | 'valor' | 'valorRango' | 'referencia'>): string[] {
  if (!p.tipoRango) return [];
  const r = RANGOS[p.tipoRango];
  const v = p.valorRango ?? p.valor;
  const motivos: string[] = [];
  if (v === null || v === undefined) return motivos;
  if (v < r.min || v > r.max) motivos.push(`fuera de rango ${p.tipoRango} (${r.min}–${r.max}): ${v}`);
  if (r.variacion !== null && p.referencia) {
    const delta = v / p.referencia - 1;
    if (Math.abs(delta) > r.variacion) motivos.push(`variación ${(delta * 100).toFixed(1)} % > ±${r.variacion * 100} % frente a ${p.referencia}`);
  }
  return motivos;
}

/**
 * Paso 6. Duplicados: misma clave exacta, misma URL (en ficheros de eventos) o mismo grupo (entidad y tipo) a ±3 días.
 * Frente a los items existentes → se descarta (nunca se modifica lo que ya hay). Entre los nuevos → se fusionan.
 */
export function deduplicar(
  aceptados: Aceptado[],
  existentes: (f: Aceptado['fichero']) => Array<Record<string, unknown>>,
): { unicos: Aceptado[]; duplicados: Descarte[] } {
  const unicos: Aceptado[] = [];
  const duplicados: Descarte[] = [];
  const esEvento = (a: Aceptado) => FICHEROS_EVENTO.includes(a.fichero);
  for (const a of aceptados) {
    const prev = existentes(a.fichero);
    const yaExiste = prev.some(
      (e) =>
        (a.duplicaA?.(e) ?? false) ||
        (esEvento(a) && e.fuente_url === a.fuente_url) ||
        (a.grupoFecha !== undefined &&
          grupoDeExistente(e) === a.grupoFecha &&
          typeof e.fecha === 'string' &&
          Math.abs(diffDays(e.fecha, a.fecha_dato)) <= 3),
    );
    if (yaExiste) {
      duplicados.push({ tarea: a.tarea, fuente_url: a.fuente_url, motivo: 'duplicado de un item existente' });
      continue;
    }
    const gemelo = unicos.find(
      (u) =>
        u.fichero === a.fichero &&
        ((a.claveDup !== undefined && u.claveDup === a.claveDup) ||
          (esEvento(a) && u.fuente_url === a.fuente_url) ||
          (a.grupoFecha !== undefined && u.grupoFecha === a.grupoFecha && Math.abs(diffDays(u.fecha_dato, a.fecha_dato)) <= 3)),
    );
    if (gemelo) {
      if (gemelo.fuente_url !== a.fuente_url) {
        gemelo.fuentesAdicionales = [...(gemelo.fuentesAdicionales ?? []), { fuente_url: a.fuente_url, cita: a.cita, cita_verificada: a.cita_verificada }];
        if (a.cita_verificada === 'snippet') gemelo.cita_verificada = 'snippet';
      }
      duplicados.push({ tarea: a.tarea, fuente_url: a.fuente_url, motivo: 'fusionado con otro item nuevo' });
      continue;
    }
    unicos.push({ ...a });
  }
  return { unicos, duplicados };
}

/** Grupo «entidad|tipo» de un item existente de eventos (para la regla ±3 días). */
export function grupoDeExistente(e: Record<string, unknown>): string | undefined {
  if (typeof e.entidad === 'string' && typeof e.tipo === 'string') return `${e.entidad}|${e.tipo}`;
  return undefined;
}
