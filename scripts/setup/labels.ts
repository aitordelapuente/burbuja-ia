// Crea o actualiza las etiquetas del repositorio que usan los jobs (sección 17, paso 20). Idempotente.
// Uso: GITHUB_TOKEN=… GITHUB_REPOSITORY=aitordelapuente/burbuja-ia pnpm tsx scripts/setup/labels.ts
import { pathToFileURL } from 'node:url';
import { clienteDesdeEntorno, type ClienteGitHub } from '../lib/github';

export const ETIQUETAS: Array<{ nombre: string; color: string; descripcion: string }> = [
  { nombre: 'automerge', color: '0e8a16', descripcion: 'PR de datos de bajo riesgo: auto-merge nativo de GitHub cuando CI pasa' },
  { nombre: 'revision-humana', color: 'd93f0b', descripcion: 'Necesita revisión y merge de una persona; ningún bot lo aprueba ni lo mergea' },
  { nombre: 'monitor', color: 'fbca04', descripcion: 'Alerta operativa abierta por J3 (se cierra sola tras 2 ejecuciones en verde)' },
  { nombre: 'contrato', color: '5319e7', descripcion: 'Una fuente externa ha cambiado de formato (J4)' },
  { nombre: 'autofix', color: 'c5def5', descripcion: 'Reservada: el agente de autorreparación no está habilitado' },
  { nombre: 'suceso', color: 'b60205', descripcion: 'Posible suceso de una condición (c1-c6); informativo o PR de c5/c6 en revisión' },
];

export async function sincronizarEtiquetas(gh: ClienteGitHub) {
  const hechas: string[] = [];
  for (const e of ETIQUETAS) {
    const actual = await gh.obtenerEtiqueta(e.nombre);
    if (!actual) {
      await gh.crearEtiqueta(e.nombre, e.color, e.descripcion);
      hechas.push(`creada ${e.nombre}`);
    } else if (actual.color !== e.color || (actual.description ?? '') !== e.descripcion) {
      await gh.actualizarEtiqueta(e.nombre, e.color, e.descripcion);
      hechas.push(`actualizada ${e.nombre}`);
    } else hechas.push(`sin cambios ${e.nombre}`);
  }
  return hechas;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const gh = clienteDesdeEntorno();
  if (!gh) {
    console.error('[labels] faltan GITHUB_TOKEN y GITHUB_REPOSITORY');
    process.exit(1);
  }
  sincronizarEtiquetas(gh)
    .then((h) => h.forEach((l) => console.log(`[labels] ${l}`)))
    .catch((e) => {
      console.error('[labels] error', e);
      process.exit(1);
    });
}
