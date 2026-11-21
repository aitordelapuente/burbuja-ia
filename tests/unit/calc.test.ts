import { describe, expect, it } from 'vitest';
import { drawdown, infoDrawdown } from '@/lib/calc/drawdown';
import { detectarSucesos, diasC4, sucesosPrecio } from '@/lib/calc/condiciones';
import { evaluarVentana } from '@/lib/calc/ventana';
import { calcularIRP, normBono, normOpv, normGravedad, normC4 } from '@/lib/calc/irp';
import { diagnosticar } from '@/lib/calc/escenario';
import { num, pct, usdGrande, NBSP, MENOS } from '@/lib/calc/formato';
import { peorRacha } from '@/lib/calc/r42';
import { addDays } from '@/lib/calc/fechas';

describe('drawdown', () => {
  it('NVDA: ATH 239,24 y cierre 125,53', () => {
    const d = drawdown(125.53, 239.24, 0.5);
    expect(d.dd * 100).toBeCloseTo(-47.53, 1);
    expect(Math.abs(d.dd * 100 - -47.53)).toBeLessThan(0.01);
    expect(d.precioUmbral).toBeCloseTo(119.62, 2);
    expect(d.distancia * 100).toBeCloseTo(-4.71, 1);
    expect(d.proximidad).toBeCloseTo(95.1, 1);
  });
  it('infoDrawdown usa el máximo de cierre, nunca el intradía', () => {
    const i = infoDrawdown([{ date: '2026-01-01', close: 100 }, { date: '2026-01-02', close: 200 }, { date: '2026-01-03', close: 150 }], 0.5)!;
    expect(i.ath).toBe(200);
    expect(i.athFecha).toBe('2026-01-02');
    expect(i.dd).toBeCloseTo(-0.25);
  });
});

describe('condiciones', () => {
  it('SOXX 123,40 frente a ATH 218,34 → cumplida', () => {
    expect(drawdown(123.4, 218.34, 0.4).cumplidaHoy).toBe(true);
    expect(drawdown(123.4, 218.34, 0.4).precioUmbral).toBeCloseTo(131.0, 1);
  });
  it('AVGO 304,41 frente a 481,57 → no cumplida, umbral 240,79', () => {
    const d = drawdown(304.41, 481.57, 0.5);
    expect(d.cumplidaHoy).toBe(false);
    expect(d.precioUmbral).toBeCloseTo(240.79, 1);
  });
  it('SMCI cumplida de forma continua desde 2024 → heredada y no cuenta', () => {
    const serie: { date: string; close: number }[] = [];
    let d = '2024-01-01';
    serie.push({ date: '2024-01-01', close: 50 }, { date: '2024-03-08', close: 118 });
    d = '2024-06-01';
    for (let i = 0; i < 900; i++) {
      serie.push({ date: d, close: 25 });
      d = addDays(d, 1);
    }
    const r = sucesosPrecio(serie, 0.5, '2026-11-20');
    expect(r.cumplidaHoy).toBe(true);
    expect(r.heredada).toBe(true);
    expect(r.sucesos).toEqual([]);
  });
  it('un cruce reciente genera suceso y no es heredada', () => {
    const r = detectarSucesos(
      [
        { date: '2026-10-01', cumplida: false },
        { date: '2026-11-19', cumplida: false },
        { date: '2026-11-20', cumplida: true },
      ],
      '2026-11-20',
    );
    expect(r.sucesos).toEqual(['2026-11-20']);
    expect(r.heredada).toBe(false);
  });
  it('recuperada: suceso en 90 días pero hoy no se cumple', () => {
    const r = detectarSucesos(
      [
        { date: '2026-10-01', cumplida: false },
        { date: '2026-10-02', cumplida: true },
        { date: '2026-10-03', cumplida: false },
      ],
      '2026-11-20',
    );
    expect(r.recuperada).toBe(true);
    expect(r.fechaSuceso).toBe('2026-10-02');
  });
});

describe('c4', () => {
  const mk = (vals: number[]) => vals.map((value, i) => ({ date: addDays('2026-11-01', i), value }));
  it('[1,0; 0,99; 1,0; 0,95; 1,0] → cumplida el 5.º día', () => {
    const d = diasC4(mk([1.0, 0.99, 1.0, 0.95, 1.0]));
    expect(d.map((x) => x.cumplida)).toEqual([false, false, false, false, true]);
    const r = detectarSucesos([{ date: '2026-10-31', cumplida: false }, ...d], '2026-11-05');
    expect(r.fechaSuceso).toBe('2026-11-05');
  });
  it('[1,0; 1,0; 1,01; 1,0; 1,0; 1,0] → no cumplida', () => {
    expect(diasC4(mk([1.0, 1.0, 1.01, 1.0, 1.0, 1.0])).some((x) => x.cumplida)).toBe(false);
  });
});

describe('ventana', () => {
  it('10/01, 05/02 y 03/03/2026 → pinchazo', () => {
    const r = evaluarVentana(
      [
        { cond: 'c1', fecha: '2026-01-10' },
        { cond: 'c2', fecha: '2026-02-05' },
        { cond: 'c4', fecha: '2026-03-03' },
      ],
      '2026-12-31',
    );
    expect(r.pinchazo).toBe(true);
    expect(r.n).toBe(3);
  });
  it('10/01, 20/04 y 01/11/2026 → no', () => {
    const r = evaluarVentana(
      [
        { cond: 'c1', fecha: '2026-01-10' },
        { cond: 'c2', fecha: '2026-04-20' },
        { cond: 'c4', fecha: '2026-11-01' },
      ],
      '2026-12-31',
    );
    expect(r.pinchazo).toBe(false);
  });
  it('3 proveedores dentro de c3 cuentan como 1', () => {
    const r = evaluarVentana(
      [
        { cond: 'c3', fecha: '2026-10-01' },
        { cond: 'c3', fecha: '2026-10-05' },
        { cond: 'c3', fecha: '2026-10-09' },
      ],
      '2026-12-31',
    );
    expect(r.n).toBe(1);
    expect(r.pinchazo).toBe(false);
  });
  it('sucesos posteriores a la fecha límite no cuentan', () => {
    const r = evaluarVentana(
      [
        { cond: 'c1', fecha: '2026-12-20' },
        { cond: 'c2', fecha: '2026-12-25' },
        { cond: 'c3', fecha: '2027-01-02' },
      ],
      '2026-12-31',
    );
    expect(r.pinchazo).toBe(false);
  });
});

const fixture63 = () => ({
  c1: (47.53 / 50) * 100,
  c2: 100,
  c3: (36.8 / 50) * 100,
  c4: normC4(3.08, 3.08, 0.05),
  c5: 0,
  c6: 0,
  I30: normBono(5.04),
  I31: 100,
  I32: normOpv(-0.248),
  I33: 50,
  I34: normGravedad(2),
});

describe('irp', () => {
  it('fixture de la sección 6.3 → 41 ±3, ámbar, E1', () => {
    const r = calcularIRP(fixture63());
    expect(r.F!).toBeCloseTo(89.6, 0);
    expect(r.R).toBe(0);
    expect(r.P!).toBeCloseTo(75.8, 0);
    expect(Math.abs(r.valor! - 41)).toBeLessThanOrEqual(3);
    expect(r.semaforo).toBe('ambar');
    const e = diagnosticar({ nVentana: 1, F: r.F, R: r.R, c4Semaforo: 'verde', c4Delta90: 0.05, c4Delta30: 0.07, labs: ['normal', 'normal'] });
    expect(e.codigo).toBe('E1');
  });
  it('con 3 sucesos en ventana → 100 · PINCHAZO', () => {
    const r = calcularIRP(fixture63(), true);
    expect(r.valor).toBe(100);
    expect(r.anulado).toBe(true);
    expect(r.etiqueta).toContain('PINCHAZO');
    const e = diagnosticar({ nVentana: 3, F: r.F, R: r.R, c4Semaforo: 'verde', c4Delta90: 0, c4Delta30: 0, labs: ['normal', 'normal'] });
    expect(e.codigo).toBe('PINCHAZO_PM');
  });
  it('parcial sin c4 → R con c5 y c6', () => {
    const r = calcularIRP({ ...fixture63(), c4: null });
    expect(r.parcial).toBe(true);
    expect(r.faltan).toEqual(['c4']);
    expect(r.R).toBe(0);
    expect(r.valor).not.toBeNull();
  });
  it('sin subíndice entero → sin dato', () => {
    const r = calcularIRP({ ...fixture63(), c4: null, c5: null, c6: null });
    expect(r.valor).toBeNull();
    expect(r.semaforo).toBe('sin_dato');
  });
});

describe('formato', () => {
  it('1234.5 → «1.234,5»', () => expect(num(1234.5)).toBe('1.234,5'));
  it('−0.475 → «−47,5 %»', () => expect(pct(-0.475)).toBe(`${MENOS}47,5${NBSP}%`));
  it('1,2e12 → «1,2 billones $»', () => expect(usdGrande(1.2e12)).toBe(`1,2 billones${NBSP}$`));
  it('millones', () => expect(num(1800000, 0)).toBe('1.800.000'));
});

describe('r42', () => {
  it('devuelve el mes del último r42 inferior', () => {
    // serie sintética: caída fuerte en sep-2001, caída menor ahora
    const serie: { date: string; close: number }[] = [];
    let d = '2001-01-01';
    let v = 100;
    for (let i = 0; i < 400; i++) {
      // entre las sesiones 150 y 192 cae un 45 %
      if (i > 150 && i <= 192) v *= 0.986;
      else if (i > 192 && i < 300) v *= 1.004;
      else if (i >= 350) v *= 0.991; // última caída ~ −31 % en 42 sesiones
      serie.push({ date: d, close: v });
      d = addDays(d, 1);
    }
    const r = peorRacha(serie);
    expect(r.actual!).toBeLessThan(-0.2);
    expect(r.anteriorFecha).not.toBeNull();
    expect(r.anteriorFecha!.slice(0, 4)).toBe('2001');
    expect(r.texto).toMatch(/^Peor caída en 2 meses desde /);
  });
});
