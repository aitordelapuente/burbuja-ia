// Sección 14 «Mantenimiento», test 1: verificación determinista de citas y cifras (18.3.4).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { verificarPropuesta, deduplicar } from '../../scripts/research/verificar';
import { citaEnTexto, cifraEnCita, normalizar } from '../../scripts/research/texto';
import type { Propuesta } from '../../scripts/research/tipos';
import { crearServidor, fixture } from './helpers';

const URL_DOC = 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000201/q3fy27cfocommentary.htm';
const servidor = crearServidor(
  http.get(URL_DOC, () => new HttpResponse(fixture('q3fy27cfocommentary.htm'), { headers: { 'content-type': 'text/html' } })),
  http.get('https://www.reuters.com/no-existe', () => new HttpResponse('Not found', { status: 404 })),
);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterAll(() => servidor.close());

const base = (p: Partial<Propuesta>): Propuesta => ({
  tarea: 'nvidia',
  fichero: 'nvidia',
  item: { trimestre: 'FY2027Q3', campo: 'guidance_musd', valor: 130000 },
  fuente_url: URL_DOC,
  cita: 'Revenue is expected to be $130.0 billion, plus or minus 3%',
  fecha_dato: '2026-11-17',
  tipo_fuente: 'primaria',
  valor: 130000,
  modelo: 'determinista',
  ...p,
});
const ctx = { hoy: '2026-11-21', desde: '2026-07-24' };

describe('research/verificar', () => {
  it('una cita que no está en el HTML → descartada', async () => {
    const r = await verificarPropuesta(base({ cita: 'Revenue is expected to be $150.0 billion, plus or minus 2%', valor: 150000 }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.descarte.motivo).toMatch(/cita_no_encontrada/);
  });

  it('cita presente pero sin la cifra 130 → descartada', async () => {
    const r = await verificarPropuesta(base({ cita: 'Revenue for the third quarter was a record $115.8 billion, up 103% from a year ago' }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.descarte.motivo).toMatch(/cifra_ausente/);
  });

  it('cita y cifra presentes → aceptada con cita_verificada:"pagina"', async () => {
    const r = await verificarPropuesta(base({}), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.aceptado.cita_verificada).toBe('pagina');
      expect(r.aceptado.requiere_revision).toBe(false);
    }
  });

  it('URL que da 404 → descartada', async () => {
    const r = await verificarPropuesta(base({ fuente_url: 'https://www.reuters.com/no-existe', tipo_fuente: 'medio' }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.descarte.motivo).toMatch(/url_no_viva/);
  });

  it('fecha futura o fuera de ventana → descartada; rumor → descartado', async () => {
    expect((await verificarPropuesta(base({ fecha_dato: '2026-12-01' }), ctx)).ok).toBe(false);
    expect((await verificarPropuesta(base({ fecha_dato: '2026-01-01' }), ctx)).ok).toBe(false);
    expect((await verificarPropuesta(base({ es_rumor: true }), ctx)).ok).toBe(false);
  });

  it('fuera de la variación máxima → aceptada pero requiere_revision', async () => {
    const r = await verificarPropuesta(base({ tipoRango: 'prevision_nvda', referencia: 80000 }), ctx);
    expect(r.ok && r.aceptado.requiere_revision).toBe(true);
  });

  it('normaliza entidades, comillas tipográficas, espacios y mayúsculas', () => {
    expect(normalizar('<p>&#8220;Neocloud&nbsp;agreements&#8221;   ARE</p>')).toBe('"neocloud agreements" are');
    expect(citaEnTexto('"Neocloud agreements" are described', fixture('q3fy27cfocommentary.htm'))).toBe(true);
    expect(citaEnTexto('Revenue is expected to be $999.0 billion', fixture('q3fy27cfocommentary.htm'))).toBe(false); // está en un <script>
  });

  it('reconoce la cifra en cualquier formato y escala', () => {
    expect(cifraEnCita(130000, 'expected to be $130.0 billion')).toBe(true);
    expect(cifraEnCita(130000, 'expected to be $130,000 million')).toBe(true);
    expect(cifraEnCita(1.03, 'up 103% from a year ago')).toBe(true);
    expect(cifraEnCita(130000, '$115.8 billion, up 103%')).toBe(false);
  });

  it('duplicados: misma URL en eventos o mismo grupo a ±3 días → se fusionan o se descartan', () => {
    const a = { ...base({}), fichero: 'eventos' as const, item: { entidad: 'OpenAI', tipo: 'quiebra' }, grupoFecha: 'OpenAI|quiebra', cita_verificada: 'pagina' as const, requiere_revision: false, motivosRevision: [] };
    const b = { ...a, fuente_url: 'https://www.ft.com/x', fecha_dato: '2026-11-19' };
    const r = deduplicar([a, b], () => [{ entidad: 'OpenAI', tipo: 'quiebra', fecha: '2026-11-01', fuente_url: 'https://otra' }]);
    expect(r.unicos).toHaveLength(1);
    expect(r.unicos[0].fuentesAdicionales?.[0].fuente_url).toBe('https://www.ft.com/x');
    const r2 = deduplicar([a], () => [{ entidad: 'OpenAI', tipo: 'quiebra', fecha: '2026-11-16' }]);
    expect(r2.unicos).toHaveLength(0);
  });
});
