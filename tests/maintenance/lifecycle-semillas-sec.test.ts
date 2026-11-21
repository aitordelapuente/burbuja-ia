// Sección 14 «Mantenimiento», tests 11 y 12: rotación de semillas del vídeo (18.7.5) y XBRL frente a J2 (18.7.3).
import { describe, expect, it } from 'vitest';
import { caducaEnPorDefecto, preferirXbrl, rotarSemilla, trimestreXbrl } from '@/lib/calc/ciclo';

describe('lifecycle/semillas', () => {
  const semillaH100 = { valor: 3.1, fecha: '2026-11-20', origen: 'video', caduca_en: caducaEnPorDefecto('2026-11-21', true) };

  it('caduca_en por defecto: vídeo + 90 días; H100, + 7 días', () => {
    expect(caducaEnPorDefecto('2026-11-21')).toBe('2027-02-19');
    expect(semillaH100.caduca_en).toBe('2026-11-28');
  });

  it('semilla de H100 con caduca_en pasada y sin sustituto → «Sin dato reciente»', () => {
    const r = rotarSemilla(semillaH100, [], '2026-12-01');
    expect(r.modo).toBe('sin_dato_reciente');
    expect(r.valor).toBeNull();
    expect(r.etiqueta).toBe('Sin dato reciente (último dato del vídeo: 3.1 (2026-11-20))');
  });

  it('con un dato de J2 más reciente → la semilla pasa a «Histórico del vídeo»', () => {
    const r = rotarSemilla(semillaH100, [{ valor: 3.12, fecha: '2026-11-21', verificado: true, origen: 'J2' }], '2026-11-22');
    expect(r).toMatchObject({ modo: 'historico_video', valor: 3.12, etiqueta: 'Histórico del vídeo', enHistorico: true });
  });

  it('un sustituto sin verificar o anterior no desplaza a la semilla vigente', () => {
    const r = rotarSemilla(semillaH100, [{ valor: 2.9, fecha: '2026-11-21', verificado: false }, { valor: 2.8, fecha: '2026-10-01', verificado: true }], '2026-11-22');
    expect(r.modo).toBe('actual');
    expect(r.valor).toBe(3.1);
  });
});

describe('lifecycle/sec', () => {
  it('un dato de J2 y uno de XBRL del mismo trimestre → la app usa XBRL', () => {
    const r = preferirXbrl({ valor: 115_900, fy: 2027, fp: 'Q3' }, { valor: 115_800, trimestre: 'FY2027Q3' });
    expect(r).toMatchObject({ fuente: 'xbrl', valor: 115_900, trimestre: 'FY2027Q3', aviso: null });
  });

  it('si difieren más de un 1 % → aviso', () => {
    const r = preferirXbrl({ valor: 118_000, fy: 2027, fp: 'Q3' }, { valor: 115_800, trimestre: 'FY2027Q3' });
    expect(r.fuente).toBe('xbrl');
    expect(r.aviso).toMatch(/difieren un 1,9|difieren un 1.9/);
  });

  it('sin XBRL del trimestre nuevo → se usa J2; el trimestre sale de fy/fp', () => {
    expect(preferirXbrl({ valor: 99_000, fy: 2027, fp: 'Q2' }, { valor: 115_800, trimestre: 'FY2027Q3' })).toMatchObject({ fuente: 'j2', valor: 115_800 });
    expect(trimestreXbrl({ fy: 2027, fp: 'FY' })).toBe('FY2027Q4');
  });
});
