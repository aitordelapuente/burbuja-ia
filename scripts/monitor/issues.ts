// Gestión de issues de J3: deduplicación por título, comentario si ya existe, cierre tras 2 ejecuciones en verde,
// y avisos externos (webhook y Resend) SOLO al abrir y al cerrar.
import type { ClienteGitHub, Comentario, Issue } from '../lib/github';
import type { Resultado } from './comprobaciones';

export const MARCA_FALLO = '<!-- monitor:fallo -->';
export const MARCA_VERDE = '<!-- monitor:verde -->';
export const VERDES_PARA_CERRAR = 2;

export const prefijoTitulo = (id: string) => `[monitor] ${id}:`;
export const tituloIssue = (r: Resultado) => `${prefijoTitulo(r.id)} ${r.resumen}`;

export interface Aviso {
  texto: string;
  nivel: 'error' | 'aviso';
  issue_url: string;
  titulo: string;
}

export type Notificador = (a: Aviso) => Promise<void>;

/** Webhook genérico y correo con Resend; cada uno solo si está configurado. Los fallos no rompen el job. */
export function notificadorDesdeEntorno(env: Record<string, string | undefined> = process.env): Notificador {
  return async (a) => {
    if (env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ texto: a.texto, nivel: a.nivel, issue_url: a.issue_url }),
        });
      } catch (e) {
        console.log(`[monitor] webhook fallido: ${String(e)}`);
      }
    }
    if (env.RESEND_API_KEY && env.ALERT_EMAIL_TO) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: env.ALERT_EMAIL_FROM || 'Panel pinchazo IA <onboarding@resend.dev>',
            to: env.ALERT_EMAIL_TO.split(',').map((s) => s.trim()),
            subject: `[Panel pinchazo IA] ${a.titulo}`,
            text: `${a.texto}\n\n${a.issue_url}`,
          }),
        });
      } catch (e) {
        console.log(`[monitor] correo fallido: ${String(e)}`);
      }
    }
  };
}

/** Número de comentarios en verde seguidos al final del hilo (tras el último fallo). */
export function verdesSeguidos(comentarios: Comentario[]): number {
  let n = 0;
  for (let i = comentarios.length - 1; i >= 0; i--) {
    if (comentarios[i].body.includes(MARCA_VERDE)) n++;
    else if (comentarios[i].body.includes(MARCA_FALLO)) break;
  }
  return n;
}

export interface Accion {
  id: string;
  accion: 'creado' | 'comentado' | 'verde' | 'cerrado' | 'nada';
  issue?: number;
}

export async function procesarResultado(
  gh: ClienteGitHub,
  r: Resultado,
  o: { abiertos: Issue[]; notificar: Notificador; runUrl: string; ahora?: Date },
): Promise<Accion> {
  const existente = o.abiertos.find((i) => i.title.startsWith(prefijoTitulo(r.id)));
  if (!r.ok) {
    const cuerpo = `${MARCA_FALLO}\n**${r.resumen}** (${r.nivel})\n\n${r.detalle}\n\nRun: ${o.runUrl}`;
    if (!existente) {
      const issue = await gh.crearIssue(tituloIssue(r), cuerpo, ['monitor']);
      await o.notificar({ texto: `Abierto: ${tituloIssue(r)}`, nivel: r.nivel, issue_url: issue.html_url, titulo: tituloIssue(r) });
      return { id: r.id, accion: 'creado', issue: issue.number };
    }
    // Ya existe: se comenta (sin aviso externo). Para no inundar el hilo, como mucho un comentario de fallo al día por resumen.
    const comentarios = await gh.listarComentarios(existente.number);
    const ahora = (o.ahora ?? new Date()).getTime();
    const reciente = comentarios.some((c) => c.body.includes(MARCA_FALLO) && c.body.includes(r.resumen) && ahora - Date.parse(c.created_at) < 24 * 3_600_000);
    const ultimoEsVerde = comentarios.length > 0 && comentarios[comentarios.length - 1].body.includes(MARCA_VERDE);
    if (reciente && !ultimoEsVerde) return { id: r.id, accion: 'nada', issue: existente.number };
    await gh.comentar(existente.number, cuerpo);
    return { id: r.id, accion: 'comentado', issue: existente.number };
  }
  if (!existente) return { id: r.id, accion: 'nada' };
  const comentarios = await gh.listarComentarios(existente.number);
  const n = verdesSeguidos(comentarios) + 1;
  if (n >= VERDES_PARA_CERRAR) {
    await gh.comentar(existente.number, `${MARCA_VERDE}\nLa comprobación pasa ${n} ejecuciones seguidas: se cierra el issue. Run: ${o.runUrl}`);
    await gh.cerrarIssue(existente.number);
    await o.notificar({ texto: `Cerrado: ${existente.title}`, nivel: r.nivel, issue_url: existente.html_url, titulo: `Resuelto: ${existente.title}` });
    return { id: r.id, accion: 'cerrado', issue: existente.number };
  }
  await gh.comentar(existente.number, `${MARCA_VERDE}\nLa comprobación vuelve a pasar (${n}/${VERDES_PARA_CERRAR}). Run: ${o.runUrl}`);
  return { id: r.id, accion: 'verde', issue: existente.number };
}

export async function procesarResultados(gh: ClienteGitHub, resultados: Resultado[], o: { notificar: Notificador; runUrl: string; ahora?: Date }) {
  const abiertos = await gh.listarIssuesAbiertos('monitor');
  const acciones: Accion[] = [];
  for (const r of resultados) acciones.push(await procesarResultado(gh, r, { ...o, abiertos }));
  return acciones;
}
