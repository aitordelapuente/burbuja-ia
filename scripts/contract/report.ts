// J4 · Informe de contratos (sección 18.6): lee los resultados de tests/contract y abre issues `[contrato]`.
// Uso: pnpm tsx scripts/contract/report.ts [--resultados=DIR] [--salida=DIR]  (por defecto, en el directorio temporal del sistema)
// Ajuste de seguridad: NO se lanza ningún agente de autorreparación (AUTOFIX_AGENT se ignora). J4 solo abre issues con el diff.
// Si solo hay campos nuevos, actualiza el snapshot y deja un PR `revision-humana` (no se mergea solo).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrirOComentar, clienteDesdeEntorno, enlaceRun, type ClienteGitHub } from '../lib/github';
import { escribirSalidaPR, leerArgs, SALIDA_POR_DEFECTO } from '../lib/ficheros';
import type { DiffEsquema, Esquema } from './infer';
import { escribirSnapshot } from './snapshots';

export const MAX_MUESTRA = 5 * 1024;

export interface ResultadoContrato {
  fuente: string;
  conector: string;
  ok: boolean;
  /** Error de red o HTTP (no implica cambio de formato). */
  error?: string;
  errorZod?: string;
  diff: DiffEsquema | null;
  observado: Esquema | null;
  muestra: string;
}

export const recortarMuestra = (s: string) => (s.length > MAX_MUESTRA ? `${s.slice(0, MAX_MUESTRA - 20)}\n… (recortado)` : s);

export function tituloContrato(fuente: string) {
  return `[contrato] ${fuente} ha cambiado de formato`;
}

export function cuerpoIssue(r: ResultadoContrato, runUrl: string, autofix: string | undefined): string {
  return [
    `La respuesta en vivo de **${r.fuente}** ya no casa con el contrato. Conector afectado: \`${r.conector}\`.`,
    '',
    r.errorZod ? `**Esquema zod del conector:** ${r.errorZod}` : '',
    r.diff?.texto ? `**Diff del esquema** (\`-\` esperado en tests/contract/snapshots/${r.fuente}.schema.json, \`+\` observado):\n\n\`\`\`diff\n${r.diff.texto}\n\`\`\`` : '',
    '',
    `<details><summary>Respuesta recortada (máx. 5 KB)</summary>\n\n\`\`\`\n${recortarMuestra(r.muestra)}\n\`\`\`\n\n</details>`,
    '',
    'Mientras no se arregle, el panel sirve el último dato válido marcado como `stale`.',
    `Agente de autorreparación: no se lanza (política del equipo${autofix && autofix !== 'off' ? `; AUTOFIX_AGENT=${autofix} se ignora` : ''}). Lo arregla una persona en un PR revisado.`,
    '',
    `Run: ${runUrl}`,
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}

export async function informarContratos(o: {
  resultados: ResultadoContrato[];
  gh: ClienteGitHub | null;
  raiz: string;
  salida: string;
  env?: Record<string, string | undefined>;
}) {
  const env = o.env ?? process.env;
  const runUrl = enlaceRun(env);
  const issues: Array<{ fuente: string; creado: boolean; numero: number }> = [];
  const actualizados: string[] = [];
  for (const r of o.resultados) {
    if (r.error) {
      console.log(`[contract] ${r.fuente}: ${r.error} (error de red o HTTP; lo vigila J3)`);
      continue;
    }
    const roto = !!r.errorZod || !!r.diff?.roto;
    if (roto && o.gh) {
      const titulo = tituloContrato(r.fuente);
      const cuerpo = cuerpoIssue(r, runUrl, env.AUTOFIX_AGENT);
      const x = await abrirOComentar(o.gh, { prefijo: titulo, titulo, cuerpo, etiquetas: ['contrato'], comentario: `Sigue roto.\n\n${cuerpo}` });
      issues.push({ fuente: r.fuente, creado: x.creado, numero: x.issue.number });
    } else if (!roto && r.diff && r.diff.nuevas.length && r.observado) {
      escribirSnapshot(o.raiz, r.fuente, r.observado, 'la respuesta en vivo (campos nuevos)');
      actualizados.push(r.fuente);
    }
  }
  escribirSalidaPR(o.salida, {
    cuerpo: actualizados.length
      ? `## J4 · Campos nuevos en las fuentes\n\nSe actualizan los snapshots de esquema de: ${actualizados.map((f) => `\`${f}\``).join(', ')}.\n\nAñadir campos no rompe los conectores. Por política del equipo este PR no se mergea solo.\n\nRun: ${runUrl}`
      : 'Sin cambios.',
    etiquetas: ['contrato', 'revision-humana'],
    hayCambios: actualizados.length > 0,
    titulo: 'J4: campos nuevos en los snapshots de esquema',
  });
  return { issues, actualizados, agenteLanzado: false as const };
}

export function leerResultados(dir: string): ResultadoContrato[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as ResultadoContrato);
}

async function principal() {
  const a = leerArgs();
  const r = await informarContratos({
    resultados: leerResultados(a.resultados || process.env.CONTRACT_OUT || join(SALIDA_POR_DEFECTO, 'contract')),
    gh: clienteDesdeEntorno(),
    raiz: a.raiz || process.cwd(),
    salida: a.salida || SALIDA_POR_DEFECTO,
  });
  console.log(`[contract] issues=${r.issues.length} snapshots_actualizados=${r.actualizados.join(',') || 'ninguno'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((e) => {
    console.error('[contract] error', e);
    process.exit(1);
  });
}
