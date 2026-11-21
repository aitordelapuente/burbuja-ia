// Etiquetas del repositorio (sección 17, paso 20) y ausencia de operaciones de aprobación o merge en el cliente de GitHub.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearClienteGitHub } from '../../scripts/lib/github';
import { ETIQUETAS, sincronizarEtiquetas } from '../../scripts/setup/labels';
import { crearServidor, githubSimulado } from './helpers';

const gh = githubSimulado();
const servidor = crearServidor(...gh.handlers);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterAll(() => servidor.close());

describe('setup/labels', () => {
  it('crea las 6 etiquetas y es idempotente', async () => {
    const cliente = crearClienteGitHub({ token: 'x', repo: gh.repo });
    const primera = await sincronizarEtiquetas(cliente);
    expect(primera.filter((l) => l.startsWith('creada'))).toHaveLength(6);
    expect([...gh.estado.etiquetas.keys()].sort()).toEqual(['autofix', 'automerge', 'contrato', 'monitor', 'revision-humana', 'suceso']);
    const segunda = await sincronizarEtiquetas(cliente);
    expect(segunda.every((l) => l.startsWith('sin cambios'))).toBe(true);
    expect(ETIQUETAS).toHaveLength(6);
  });

  it('el cliente de GitHub de los jobs no expone aprobar, mergear ni cerrar PR', () => {
    const cliente = crearClienteGitHub({ token: 'x', repo: gh.repo });
    expect(Object.keys(cliente).filter((k) => /merge|aprob|approve|review|cerrarPR/i.test(k))).toEqual([]);
  });
});
