// Sección 14 «Mantenimiento», test 3: clasificación automerge / revision-humana (18.3.5, con el ajuste de seguridad).
import { describe, expect, it } from 'vitest';
import { clasificarPR, soloAltas } from '../../scripts/research/clasificar';
import { comprobarRango } from '../../scripts/research/verificar';
import type { Aceptado } from '../../scripts/research/tipos';
import { clasificarJ1 } from '../../scripts/collect/gpu-abierto';

const aceptado = (p: Partial<Aceptado>): Aceptado => ({
  tarea: 'gpu_oficial',
  fichero: 'gpu_alquiler',
  item: { fecha: '2026-11-21', gpu: 'h100', indice: 'SDH100RT', usd_hora: '3.12', fuente: 'https://www.silicondata.com/products/silicon-index/h100', verificado: 'true' },
  fuente_url: 'https://www.silicondata.com/products/silicon-index/h100',
  cita: 'As of Nov 21, 2026 3.12 USD / GPU-hour',
  fecha_dato: '2026-11-21',
  tipo_fuente: 'primaria',
  valor: 3.12,
  modelo: 'determinista',
  cita_verificada: 'pagina',
  requiere_revision: false,
  motivosRevision: [],
  ...p,
});
const filaPrevia = { fecha: '2026-11-20', gpu: 'h100', indice: 'SDH100RT', usd_hora: '3.08', fuente: 'x', verificado: 'true' };
const cambioAlta = (nuevo: Record<string, unknown>) => [{ fichero: 'gpu_alquiler', antes: [filaPrevia], despues: [filaPrevia, nuevo] }];

describe('research/automerge', () => {
  it('un PR solo con altas de GPU dentro de rango → automerge', () => {
    const a = aceptado({});
    expect(clasificarPR([a], cambioAlta(a.item)).etiquetas).toEqual(['automerge']);
  });

  it('una variación de +30 % → revision-humana', () => {
    const motivos = comprobarRango({ tipoRango: 'h100', valor: 4.0, referencia: 3.08 });
    expect(motivos.join()).toMatch(/variación/);
    const a = aceptado({ valor: 4.0, requiere_revision: true, motivosRevision: motivos });
    expect(clasificarPR([a], cambioAlta(a.item)).etiquetas).toEqual(['revision-humana']);
  });

  it('un item de quiebra → revision-humana (y suceso), nunca automerge', () => {
    const a = aceptado({ fichero: 'eventos', tarea: 'eventos', valor: null, item: { id: 'x', tipo: 'quiebra', entidad: 'OpenAI', titulo: 'OpenAI files for Chapter 11', fecha: '2026-11-20' } });
    const r = clasificarPR([a], [{ fichero: 'eventos', antes: [], despues: [a.item] }]);
    expect(r.etiquetas).toContain('revision-humana');
    expect(r.etiquetas).toContain('suceso');
    expect(r.etiquetas).not.toContain('automerge');
  });

  it('la modificación de un item existente → revision-humana', () => {
    const a = aceptado({});
    const modificada = { ...filaPrevia, usd_hora: '2.50' };
    expect(soloAltas([filaPrevia], [modificada, a.item])).toBe(false);
    expect(clasificarPR([a], [{ fichero: 'gpu_alquiler', antes: [filaPrevia], despues: [modificada, a.item] }]).etiquetas).toEqual(['revision-humana']);
  });

  it('cita solo en snippet, gravedad 3 o laboratorio en tensión → revision-humana', () => {
    expect(clasificarPR([aceptado({ cita_verificada: 'snippet' })], []).etiquetas).toEqual(['revision-humana']);
    expect(clasificarPR([aceptado({ fichero: 'regulacion', item: { gravedad: 3, titulo: 'x' } })], []).etiquetas).toEqual(['revision-humana']);
    expect(clasificarPR([aceptado({ fichero: 'laboratorios', item: { lab: 'OpenAI', estado: 'tension' } })], []).etiquetas).toEqual(['revision-humana']);
  });

  it('J1: solo filas del día en rango → automerge; tocar días anteriores o salir de rango → revision-humana', () => {
    const antes = [{ fecha: '2026-11-20', gpu: 'H100', lectura: 'neo', valor: '2.65', fuentes_usadas: 'runpod+vast', detalle_json: '{}' }];
    const hoy = { fecha: '2026-11-21', gpu: 'H100', lectura: 'neo', valor: '2.69', fuentes_usadas: 'runpod+vast', detalle_json: '{}' };
    expect(clasificarJ1(antes, [...antes, hoy], '2026-11-21').etiqueta).toBe('automerge');
    expect(clasificarJ1(antes, [{ ...antes[0], valor: '1' }, hoy], '2026-11-21').etiqueta).toBe('revision-humana');
    expect(clasificarJ1(antes, [...antes, { ...hoy, valor: '50' }], '2026-11-21').etiqueta).toBe('revision-humana');
    expect(clasificarJ1(antes, [...antes, { ...hoy, valor: '3.6' }], '2026-11-21').etiqueta).toBe('revision-humana');
  });
});
