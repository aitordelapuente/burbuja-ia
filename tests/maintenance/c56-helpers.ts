// Cliente de GitHub de prueba que falla si alguien intenta usarlo (J2 no debe tocar PR ni issues en estos casos).
import type { ClienteGitHub } from '../../scripts/lib/github';

export function crearGitHubNoUsado(): ClienteGitHub {
  const fallar = async (): Promise<never> => {
    throw new Error('J2 no debe llamar a GitHub en este caso');
  };
  return {
    repo: 'prueba/panel-pinchazo-ia',
    listarIssuesAbiertos: fallar,
    crearIssue: fallar,
    comentar: fallar,
    listarComentarios: fallar,
    cerrarIssue: fallar,
    listarPRsAbiertos: fallar,
    ultimoRunExitoso: fallar,
    repositoryDispatch: fallar,
    obtenerEtiqueta: fallar,
    crearEtiqueta: fallar,
    actualizarEtiqueta: fallar,
  };
}
