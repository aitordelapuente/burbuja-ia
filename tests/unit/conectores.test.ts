import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsearGamma, parsearHistorial } from '@/lib/connectors/polymarket';
import { parsearFredCsv } from '@/lib/connectors/fred';
import { parsearYahoo } from '@/lib/connectors/yahoo';
import { parsearConcepto, trimestrales } from '@/lib/connectors/sec';
import { parsearSilicon } from '@/lib/connectors/silicondata';
import { parsearGpuCsv } from '@/lib/connectors/csv';
import { EventosSchema, NvidiaSchema } from '@/lib/schemas';

const fx = (p: string) => JSON.parse(readFileSync(`tests/fixtures/${p}`, 'utf8'));

describe('polymarket', () => {
  it('parsea outcomes y outcomePrices en string → probSi = 0,693', () => {
    const ev = parsearGamma(fx('polymarket/events-ai-bubble-burst-by.json'));
    const m = ev[0].mercados.find((x) => x.slug === 'ai-industry-downturn-by-december-31-2026-857')!;
    expect(m.probSi).toBeCloseTo(0.693, 6);
    expect(m.tokenSi).toMatch(/^1+$/);
  });
  it('si falta outcomePrices usa lastTradePrice', () => {
    const ev = parsearGamma([{ slug: 'x', markets: [{ slug: 'm', outcomes: '["Yes","No"]', lastTradePrice: 0.42 }] }]);
    expect(ev[0].mercados[0].probSi).toBe(0.42);
  });
  it('historial: t en segundos y p de 0 a 1', () => {
    const h = parsearHistorial({ history: [{ t: 1795219200, p: 0.0795 }, { t: 1795305600, p: 0.5535 }] });
    expect(h[1].value).toBe(0.5535);
    expect(h[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('fred', () => {
  it('el valor «.» se convierte en null', () => {
    const f = parsearFredCsv('observation_date,DGS10\n2026-11-18,5.01\n2026-11-19,.\n2026-11-20,5.04\n');
    expect(f[1].value).toBeNull();
    expect(f[2].value).toBe(5.04);
  });
});

describe('yahoo', () => {
  it('descarta los puntos con close: null y usa la zona de la bolsa', () => {
    const raw = {
      chart: { result: [{ meta: { symbol: 'NVDA', currency: 'USD', exchangeTimezoneName: 'America/New_York' }, timestamp: [1795204800, 1795291200, 1795377600], indicators: { quote: [{ close: [130, null, 125.53] }] } }], error: null },
    };
    const s = parsearYahoo(raw);
    expect(s.points.length).toBe(2);
    expect(s.points[1].close).toBe(125.53);
  });
  it('un cambio de formato hace fallar la validación', () => {
    expect(() => parsearYahoo({ chart: { result: [{ meta: {}, indicators: {} }] } })).toThrow();
  });
});

describe('sec', () => {
  it('deduplica por end + fp con el filed más reciente y deriva el 4.º trimestre', () => {
    const h = parsearConcepto(fx('sec/Revenues.json'));
    const q = trimestrales(h);
    const q4 = q.find((x) => x.end === '2025-01-26')!;
    expect(q4.fp).toBe('Q4');
    expect(q4.val).toBe(39331e6);
  });
});

describe('silicondata', () => {
  it('ignora los valores negativos («aún no generado»)', () => {
    const p = parsearSilicon({ data: { indexes: { '2026-11-20': '3.08', '2026-11-21': '-1' } } });
    expect(p).toEqual([{ date: '2026-11-20', value: 3.08 }]);
  });
});

describe('manual', () => {
  it('un JSON inválido hace fallar la validación', () => {
    expect(EventosSchema.safeParse({ _ayuda: 'x', items: [{ id: 1, tipo: 'quiebra' }] }).success).toBe(false);
    expect(NvidiaSchema.safeParse({ items: [] }).success).toBe(false);
  });
  it('todos los ficheros del repositorio pasan el esquema', async () => {
    const { cargarManual } = await import('@/lib/connectors/manual');
    expect(() => cargarManual()).not.toThrow();
  });
  it('una fila de CSV inválida hace fallar', () => {
    expect(() => parsearGpuCsv('fecha,gpu,indice,usd_hora,fuente,verificado\n2026-13-01,h100,SDH100RT,abc,x,true\n')).toThrow();
  });
});
