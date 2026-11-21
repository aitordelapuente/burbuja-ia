// J3 · Monitorización y alertas (sección 18.5).
// Uso: pnpm tsx scripts/monitor/run.ts [--modo=completo|despliegue] [--raiz=DIR]
// Entorno: SITE_URL, HEALTH_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY, RESEARCH_CLAVE_PRESENTE, ALERT_WEBHOOK_URL,
// RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_EMAIL_FROM. Abre/actualiza/cierra issues `[monitor]`; nunca toca PR.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pedirJson, dormirReal } from '../lib/http';
import { abrirOComentar, clienteDesdeEntorno, enlaceRun, type ClienteGitHub } from '../lib/github';
import { leerArgs, leerCsv, salidaActions } from '../lib/ficheros';
import {
  comprobarDatos,
  comprobarHealth,
  comprobarModoReducido,
  comprobarPolymarket,
  comprobarPortada,
  comprobarPRs,
  comprobarRun,
  comprobarXbrl,
  proxyC4Urgente,
  sucesosNuevos,
  type Resultado,
  type SnapshotMin,
} from './comprobaciones';
import { notificadorDesdeEntorno, procesarResultados, type Notificador } from './issues';

export interface OpcionesJ3 {
  site: string;
  healthToken: string;
  gh: ClienteGitHub | null;
  raiz: string;
  ahora?: Date;
  clavePresente: boolean;
  notificar?: Notificador;
  runUrl?: string;
}

export async function ejecutarJ3(o: OpcionesJ3) {
  const ahora = o.ahora ?? new Date();
  const site = o.site.replace(/\/$/, '');
  const resultados: Resultado[] = [
    await comprobarHealth(site),
    o.healthToken ? await comprobarDatos(site, o.healthToken) : { id: 'datos', ok: false, nivel: 'aviso' as const, resumen: 'falta HEALTH_TOKEN', detalle: '' },
    await comprobarPortada(site),
  ];
  const snap = await pedirJson<SnapshotMin>(`${site}/api/snapshot`, { reintentos: 1 });
  if (snap.ok) resultados.push(...comprobarPolymarket(snap.data), comprobarXbrl(snap.data));
  else resultados.push({ id: 'snapshot', ok: false, nivel: 'error', resumen: `/api/snapshot falla (${snap.error})`, detalle: '' });
  if (o.gh) {
    resultados.push(await comprobarRun(o.gh, 'j1', 'collect.yml', 26, ahora));
    resultados.push(await comprobarRun(o.gh, 'j2', 'research.yml', 26, ahora));
    try {
      resultados.push(...comprobarPRs(await o.gh.listarPRsAbiertos(), ahora));
    } catch (e) {
      console.log(`[monitor] no se pueden listar PR: ${String(e)}`);
    }
  }
  resultados.push(comprobarModoReducido(o.clavePresente));

  const urgencias: string[] = [];
  if (snap.ok && o.gh) {
    const runUrl = o.runUrl ?? enlaceRun();
    const registrados = leerCsv(join(o.raiz, 'data/auto/sucesos.csv'), ['fecha', 'condicion', 'detalle']).filas.map((f) => ({ fecha: f.fecha, condicion: f.condicion }));
    const nuevos = sucesosNuevos(snap.data, registrados);
    const c4 = proxyC4Urgente(snap.data);
    for (const s of nuevos) {
      const titulo = `[suceso] ${s.cond}: nuevo suceso el ${s.fecha}`;
      await abrirOComentar(o.gh, { prefijo: titulo, titulo, cuerpo: `El snapshot muestra un suceso nuevo de ${s.cond} el ${s.fecha}. Se lanza J2 (research-urgente). Informativo.\n\nRun: ${runUrl}`, etiquetas: ['suceso'], comentario: `Sigue presente. Run: ${runUrl}` });
      urgencias.push(`${s.cond} ${s.fecha}`);
    }
    if (c4) {
      const titulo = '[suceso] c4: Posible activación de c4';
      await abrirOComentar(o.gh, { prefijo: titulo, titulo, cuerpo: `El proxy abierto IAA_neo H100 marca ≤ 1,20 $/h dos días seguidos. J2 comprueba la página de Silicon Data (research-urgente).\n\nRun: ${runUrl}`, etiquetas: ['suceso'], comentario: `Sigue ≤ 1,20 $/h. Run: ${runUrl}` });
      urgencias.push('c4 proxy ≤ 1,20');
    }
    if (urgencias.length) await o.gh.repositoryDispatch('research-urgente', { motivo: urgencias.join('; ') });
  }

  const acciones = o.gh ? await procesarResultados(o.gh, resultados, { notificar: o.notificar ?? notificadorDesdeEntorno(), runUrl: o.runUrl ?? enlaceRun(), ahora }) : [];
  return { resultados, acciones, urgencias };
}

/** Modo despliegue: comprobaciones 1 y 3; si fallan dos veces seguidas en 15 min → rollback=true. */
export async function ejecutarDespliegue(site: string, esperaMs = 5 * 60_000, dormir = dormirReal) {
  for (let intento = 1; intento <= 2; intento++) {
    const [h, p] = [await comprobarHealth(site), await comprobarPortada(site)];
    if (h.ok && p.ok) return { rollback: false, intentos: intento, motivo: '' };
    if (intento === 2) return { rollback: true, intentos: 2, motivo: [h, p].filter((x) => !x.ok).map((x) => x.resumen).join('; ') };
    await dormir(esperaMs);
  }
  return { rollback: false, intentos: 2, motivo: '' };
}

async function principal() {
  const a = leerArgs();
  const site = process.env.SITE_URL || '';
  if (!site) {
    console.error('[monitor] falta SITE_URL');
    process.exit(1);
  }
  if (a.modo === 'despliegue') {
    const d = await ejecutarDespliegue(site.replace(/\/$/, ''));
    salidaActions('rollback', String(d.rollback));
    salidaActions('motivo', d.motivo.replace(/\n/g, ' '));
    console.log(`[monitor] despliegue: rollback=${d.rollback} ${d.motivo}`);
    return;
  }
  const r = await ejecutarJ3({
    site,
    healthToken: process.env.HEALTH_TOKEN || '',
    gh: clienteDesdeEntorno(),
    raiz: a.raiz || process.cwd(),
    clavePresente: process.env.RESEARCH_CLAVE_PRESENTE === 'true',
  });
  for (const x of r.resultados) console.log(`[monitor] ${x.ok ? 'OK ' : 'MAL'} ${x.id}: ${x.resumen}`);
  for (const x of r.acciones) if (x.accion !== 'nada') console.log(`[monitor] issue ${x.id}: ${x.accion} #${x.issue}`);
  // El job falla (rojo) si alguna comprobación de nivel error falla, para que se vea en Actions.
  if (r.resultados.some((x) => !x.ok && x.nivel === 'error')) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    console.error('[monitor] error', e);
    process.exit(1);
  });
}
