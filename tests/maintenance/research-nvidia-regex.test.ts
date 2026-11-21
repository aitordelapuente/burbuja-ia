// Sección 14 «Mantenimiento», test 2: regex de la sección 18.3.1 sobre el fixture SINTÉTICO q3fy27cfocommentary.htm.
import { describe, expect, it } from 'vitest';
import { extraerNvidia, siguienteTrimestre, trimestreFiscal } from '../../scripts/research/tareas/nvidia';
import { htmlATexto } from '../../scripts/research/texto';
import { fixture } from './helpers';

describe('research/nvidia-regex', () => {
  const datos = extraerNvidia(htmlATexto(fixture('q3fy27cfocommentary.htm')));
  const de = (c: string) => datos.find((d) => d.campo === c);

  it('extrae ingresos 115,8 mil M$ y +103 %', () => {
    expect(de('ingresos_musd')?.valorMusd).toBe(115800);
    expect(de('ingresos_musd')?.crecInteranual).toBeCloseTo(1.03, 10);
    expect(de('ingresos_musd')?.cita).toContain('Revenue for the third quarter was a record $115.8 billion, up 103% from a year ago');
  });

  it('extrae la previsión de 130,0 mil M$ (y no el texto de un <script>)', () => {
    expect(de('guidance_musd')?.valorMusd).toBe(130000);
    expect(de('guidance_musd')?.cita).toContain('Revenue is expected to be $130.0 billion, plus or minus 3%');
  });

  it('extrae la garantía máxima de 105 mil M$', () => {
    expect(de('garantia_mayor_musd')?.valorMusd).toBe(105000);
    expect(de('garantia_mayor_musd')?.cita).toContain('up to a maximum of $105 billion');
  });

  it('deriva el trimestre fiscal del nombre del documento o de la fecha', () => {
    expect(trimestreFiscal('q3fy27cfocommentary.htm', '2026-11-17')).toBe('FY2027Q3');
    expect(trimestreFiscal('nvda-pr.htm', '2026-11-17', 'third')).toBe('FY2027Q3');
    expect(trimestreFiscal('nvda-pr.htm', '2027-02-25', 'fourth')).toBe('FY2027Q4');
    expect(siguienteTrimestre('FY2027Q3')).toBe('FY2027Q4');
    expect(siguienteTrimestre('FY2027Q4')).toBe('FY2028Q1');
  });
});
