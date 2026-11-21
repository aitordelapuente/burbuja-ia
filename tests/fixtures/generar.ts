/**
 * Genera los fixtures de MOCK_DATA=1 (tests, CI y modo simulado).
 *
 * El entorno de construcción no tenía red hacia las fuentes, así que las series se SINTETIZAN
 * (sección 17, paso 5) anclándolas a los valores verificados de las secciones 4.2 y 6.3 de la
 * especificación. Entre anclas, la trayectoria es una interpolación geométrica con ruido
 * determinista: NO son datos reales y solo se usan en modo simulado.
 *
 * Uso: pnpm tsx tests/fixtures/generar.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(process.cwd(), 'tests', 'fixtures');
const HOY = '2026-11-20';

// --- generador pseudoaleatorio determinista ---
function rng(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const hash = (t: string) => Array.from(t).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function diasHabiles(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const d = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (d <= fin) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

type Ancla = [string, number];
interface Opciones {
  ruido?: number;
  /** Fecha y valor del máximo histórico: ningún otro cierre lo supera. */
  ath?: Ancla;
  /** Suelo y techo opcionales por tramo de fechas. */
  limites?: Array<{ desde: string; hasta: string; min?: number; max?: number }>;
}

/** Serie diaria (días hábiles) que pasa exactamente por las anclas. */
function serie(simbolo: string, anclas: Ancla[], o: Opciones = {}): Array<[string, number]> {
  const r = rng(hash(simbolo));
  const fechas = diasHabiles(anclas[0][0], anclas[anclas.length - 1][0]);
  const ruido = o.ruido ?? 0.006;
  const out: Array<[string, number]> = [];
  let k = 0;
  for (const f of fechas) {
    while (k < anclas.length - 2 && f > anclas[k + 1][0]) k++;
    const [fa, va] = anclas[k];
    const [fb, vb] = anclas[k + 1];
    const ta = new Date(fa).getTime();
    const tb = new Date(fb).getTime();
    const x = tb === ta ? 0 : (new Date(f).getTime() - ta) / (tb - ta);
    let v = va * Math.pow(vb / va, Math.min(1, Math.max(0, x)));
    const esAncla = anclas.some((a) => a[0] === f);
    if (!esAncla) v *= 1 + (r() - 0.5) * 2 * ruido;
    else v = anclas.find((a) => a[0] === f)![1];
    if (o.ath && f !== o.ath[0]) v = Math.min(v, o.ath[1] * 0.997);
    for (const l of o.limites ?? []) {
      if (f >= l.desde && f <= l.hasta && !esAncla) {
        if (l.min !== undefined) v = Math.max(v, l.min);
        if (l.max !== undefined) v = Math.min(v, l.max);
      }
    }
    out.push([f, Math.round(v * 100) / 100]);
  }
  return out;
}

/** Envuelve una serie en el formato crudo de Yahoo chart v8 (con algún close: null). */
function yahooRaw(simbolo: string, puntos: Array<[string, number]>, moneda = 'USD', zona = 'America/New_York') {
  // 16:00 hora de Nueva York ≈ 21:00 UTC
  const timestamp = puntos.map(([f]) => Math.floor(new Date(`${f}T20:00:00Z`).getTime() / 1000));
  const close: Array<number | null> = puntos.map(([, v]) => v);
  // Un hueco con close null a mitad de serie (se descarta al parsear).
  if (close.length > 30) {
    timestamp.splice(10, 0, timestamp[10] - 3600);
    close.splice(10, 0, null);
  }
  return {
    chart: {
      result: [
        {
          meta: { currency: moneda, symbol: simbolo, exchangeTimezoneName: zona, instrumentType: 'EQUITY', _fixture: 'SINTÉTICO: solo para MOCK_DATA=1' },
          timestamp,
          indicators: { quote: [{ close }] },
        },
      ],
      error: null,
    },
  };
}

function escribir(dir: string, nombre: string, contenido: unknown) {
  const d = path.join(RAIZ, dir);
  mkdirSync(d, { recursive: true });
  writeFileSync(path.join(d, nombre), typeof contenido === 'string' ? contenido : JSON.stringify(contenido));
}
const nombreYahoo = (s: string) => `${s.replace(/[^A-Za-z0-9.]/g, '_')}.json`;
const yahoo = (s: string, p: Array<[string, number]>, moneda?: string, zona?: string) => escribir('yahoo', nombreYahoo(s), yahooRaw(s, p, moneda, zona));

// ================= Series de mercado =================
// NVDA: ATH 239,24 el 06/10/2026; cierre 20/11 125,53 (−47,5 %); −22,9 % en la semana. Nunca toca 119,62.
yahoo('NVDA', serie('NVDA', [
  ['2016-01-04', 0.8], ['2021-11-29', 33], ['2022-10-14', 11.2], ['2024-06-18', 135.6], ['2025-04-07', 97],
  ['2025-11-03', 205], ['2026-04-01', 190], ['2026-10-06', 239.24], ['2026-11-13', 162.81], ['2026-11-17', 150.2], ['2026-11-20', 125.53],
], { ath: ['2026-10-06', 239.24], limites: [{ desde: '2026-10-07', hasta: HOY, min: 124 }] }));

// SOXX: ATH 218,34 el 22/06/2026; cruza el umbral (131,00) el 17/11/2026; cierre 123,40; −34,6 % en 42 sesiones.
yahoo('SOXX', serie('SOXX', [
  ['2016-01-04', 30], ['2021-12-27', 85], ['2022-10-13', 50], ['2024-07-10', 135], ['2025-04-08', 80], ['2025-12-01', 175],
  ['2026-06-22', 218.34], ['2026-09-21', 192], ['2026-09-23', 188.69], ['2026-11-13', 139.5], ['2026-11-16', 133.9], ['2026-11-17', 129.8],
  ['2026-11-18', 127.1], ['2026-11-19', 125.2], ['2026-11-20', 123.4],
], { ath: ['2026-06-22', 218.34], limites: [{ desde: '2026-06-23', hasta: '2026-11-16', min: 131.5 }] }));

// ^SOX desde 1994: peor racha de 42 sesiones en 2001 (≈ −45 %); 2008 más suave (≈ −30 %); hoy ≈ −32,9 %.
yahoo('^SOX', serie('^SOX', [
  ['1994-05-04', 160], ['2000-03-10', 1330], ['2001-01-02', 700], ['2001-07-20', 640], ['2001-09-21', 350], ['2001-10-03', 520], ['2002-01-04', 600],
  ['2007-07-16', 520], ['2008-09-02', 340], ['2008-10-30', 240], ['2009-06-01', 270], ['2015-06-01', 720], ['2021-12-27', 4000],
  ['2022-10-13', 2200], ['2024-07-10', 5900], ['2025-04-08', 3600], ['2026-06-22', 9800], ['2026-09-23', 8300], ['2026-11-20', 5569],
], { ruido: 0.004 }));

// Nasdaq: ATH 27.599,79 el 06/10/2026; cierre −18,1 %; −5,3 % el 20/11 y −10,0 % en la semana. Máximo de 2000 el 10/03/2000.
const ixicCierre = 27599.79 * (1 - 0.181);
yahoo('^IXIC', serie('^IXIC', [
  ['1971-02-05', 100], ['1990-10-16', 330], ['1999-01-04', 2200], ['2000-03-10', 5048.62], ['2001-04-04', 1638], ['2002-10-09', 1114],
  ['2007-10-31', 2859], ['2009-03-09', 1268], ['2021-11-19', 16057], ['2022-12-28', 10213], ['2025-04-08', 15268], ['2026-10-06', 27599.79],
  ['2026-11-13', ixicCierre / 0.9], ['2026-11-19', ixicCierre / 0.947], ['2026-11-20', ixicCierre],
], { ath: ['2026-10-06', 27599.79], ruido: 0.004, limites: [{ desde: '2000-01-01', hasta: '2000-03-09', max: 5040 }, { desde: '2000-03-11', hasta: '2014-12-31', max: 5040 }] }));

// Proveedores (c3): caídas del 20/11/2026 de la sección 4.2.
const prov: Array<[string, number, string, number]> = [
  ['AVGO', 481.57, '2026-09-10', 304.41],
  ['ASML', 1410, '2026-07-15', 1410 * (1 - 0.364)],
  ['TSM', 365, '2026-08-20', 365 * (1 - 0.344)],
  ['ANET', 182, '2026-10-01', 182 * (1 - 0.227)],
];
for (const [s, ath, fAth, cierre] of prov) {
  yahoo(s, serie(s, [['2016-01-04', ath * 0.06], ['2022-10-13', ath * 0.25], ['2025-04-08', ath * 0.45], [fAth, ath], ['2026-11-13', cierre * 1.08], [HOY, cierre]], { ath: [fAth, ath] }));
}
// SMCI: máximo en marzo de 2024 y −81,8 % hoy, por debajo de la mitad desde mediados de 2024 (heredada).
yahoo('SMCI', serie('SMCI', [['2016-01-04', 3], ['2024-03-08', 118.81], ['2024-08-01', 52], ['2024-11-14', 18], ['2026-03-01', 30], [HOY, 118.81 * (1 - 0.818)]], {
  ath: ['2024-03-08', 118.81], limites: [{ desde: '2024-08-01', hasta: HOY, max: 58 }],
}));

// Componentes del SOXX (valores de prueba).
const comp: Array<[string, number, number]> = [['AMD', 265, 0.41], ['MRVL', 128, 0.47], ['INTC', 52, 0.35], ['MU', 238, 0.44], ['AMAT', 268, 0.38], ['LRCX', 162, 0.4], ['KLAC', 1240, 0.33]];
for (const [s, ath, caida] of comp) {
  yahoo(s, serie(s, [['2016-01-04', ath * 0.08], ['2022-10-13', ath * 0.3], ['2026-07-01', ath], [HOY, ath * (1 - caida)]], { ath: ['2026-07-01', ath] }));
}
// ETF global de semiconductores (LSE en USD y Xetra en EUR): caída similar a la del SOXX.
yahoo('SEMI.L', serie('SEMI.L', [['2023-09-01', 5], ['2026-06-22', 11.2], [HOY, 11.2 * (1 - 0.42)]], { ath: ['2026-06-22', 11.2] }), 'USD', 'Europe/London');
yahoo('SEC0.DE', serie('SEC0.DE', [['2023-09-01', 4.7], ['2026-06-22', 9.9], [HOY, 9.9 * (1 - 0.43)]], { ath: ['2026-06-22', 9.9] }), 'EUR', 'Europe/Berlin');
// Anthropic (ANT): pocas sesiones desde la OPV a 83 $ (valores de prueba).
yahoo('ANT', [['2026-11-16', 88.4], ['2026-11-17', 86.1], ['2026-11-18', 84.9], ['2026-11-19', 83.6], ['2026-11-20', 80.15]]);
// IPO ETF: 41,35 $; −11,5 % en 5 días; −24,8 % en 60 días naturales.
yahoo('IPO', serie('IPO', [['2019-01-02', 25], ['2021-02-12', 75], ['2023-01-03', 25], ['2026-07-01', 52], ['2026-09-21', 41.35 / 0.752], ['2026-09-22', 41.35 / 0.752], ['2026-11-13', 41.35 / 0.885], [HOY, 41.35]]));
// ^TNX (en %)
yahoo('^TNX', serie('^TNX', [['2024-01-02', 3.9], ['2025-06-02', 4.4], ['2026-11-19', 5.04], [HOY, 5.06]], { ruido: 0.003 }));

// ================= FRED =================
function fredCsv(nombre: string, filas: Array<[string, number | null]>) {
  return `observation_date,${nombre}\n${filas.map(([f, v]) => `${f},${v === null ? '.' : v}`).join('\n')}\n`;
}
const dgs10 = serie('DGS10', [['2024-01-02', 3.95], ['2025-06-02', 4.4], ['2026-06-01', 4.6], ['2026-11-19', 5.04]], { ruido: 0.004 }).map(([f, v]) => [f, v] as [string, number | null]);
dgs10.splice(dgs10.length - 30, 0, ['2026-10-12', null]); // festivo con «.»
escribir('fred', 'DGS10.csv', fredCsv('DGS10', dgs10.sort((a, b) => a[0].localeCompare(b[0]))));
const tramos = (pares: Array<[string, number]>, hasta: string) => {
  const out: Array<[string, number]> = [];
  const d = new Date(`${pares[0][0]}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (d <= fin) {
    const f = d.toISOString().slice(0, 10);
    const v = [...pares].reverse().find((p) => p[0] <= f)![1];
    out.push([f, v]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};
escribir('fred', 'DFEDTARU.csv', fredCsv('DFEDTARU', tramos([['2025-01-01', 4.5], ['2025-09-18', 4.25], ['2025-10-30', 4.0], ['2025-12-11', 3.75], ['2026-09-17', 4.0]], '2026-11-20')));
escribir('fred', 'DFEDTARL.csv', fredCsv('DFEDTARL', tramos([['2025-01-01', 4.25], ['2025-09-18', 4.0], ['2025-10-30', 3.75], ['2025-12-11', 3.5], ['2026-09-17', 3.75]], '2026-11-20')));

// ================= Polymarket =================
const desc = 'This market will resolve to "Yes" if at least three of the following events occur within any 90-day window ending on or before December 31, 2026, 11:59 PM ET: (1) NVDA closes 50% or more below its all-time high closing price; (2) SOXX closes 40% or more below its all-time high closing price; (3) TSMC, ASML, Broadcom, Arista or Supermicro closes 50% or more below its all-time high closing price; (4) the Silicon Data H100 rental index (SDH100RT) is at or below $1.00/hour for 5 consecutive days; (5) OpenAI or Anthropic files for bankruptcy; (6) OpenAI is acquired. [FIXTURE SINTÉTICO: texto de prueba, no es el reglamento original]';
const tok26 = '1111111111111111111111111111111111111111111111111111111111111111';
const tok27 = '2222222222222222222222222222222222222222222222222222222222222222';
escribir('polymarket', 'events-ai-bubble-burst-by.json', [
  {
    slug: 'ai-bubble-burst-by',
    title: 'AI bubble burst by...?',
    description: desc,
    markets: [
      { slug: 'ai-industry-downturn-by-december-31-2026-857', question: 'AI bubble burst in 2026?', endDate: '2026-12-31T12:00:00Z', closed: false, outcomes: '["Yes", "No"]', outcomePrices: '["0.693", "0.307"]', clobTokenIds: JSON.stringify([tok26, '3']), lastTradePrice: 0.69, volume: '4812345.5' },
      { slug: 'ai-bubble-burst-by-june-30-2027', question: 'AI bubble burst by June 30, 2027?', endDate: '2027-06-30T12:00:00Z', closed: false, outcomes: '["Yes", "No"]', outcomePrices: '["0.745", "0.255"]', clobTokenIds: JSON.stringify([tok27, '4']), lastTradePrice: 0.74, volume: '1203456' },
    ],
  },
]);
function historial(base: number, finales: Array<[string, number]>) {
  const r = rng(hash(String(base)));
  const out: Array<{ t: number; p: number }> = [];
  const d = new Date('2026-05-01T00:00:00Z');
  const fin = new Date('2026-11-19T00:00:00Z');
  while (d <= fin) {
    out.push({ t: Math.floor(d.getTime() / 1000), p: Math.round((base + (r() - 0.5) * 0.03) * 1000) / 1000 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  for (const [f, p] of finales) out.push({ t: Math.floor(new Date(`${f}T00:00:00Z`).getTime() / 1000), p });
  return { history: out };
}
escribir('polymarket', `history-${tok26}.json`, historial(0.07, [['2026-11-20', 0.0795], ['2026-11-21', 0.5535]]));
escribir('polymarket', `history-${tok27}.json`, historial(0.3, [['2026-11-20', 0.35], ['2026-11-21', 0.745]]));

// ================= SEC =================
// Ingresos trimestrales (M$ → $). FY2027 Q3 (115.800 M$) aún no está en XBRL: se usa el dato manual.
const trimestres: Array<[string, string, number, number, string, string]> = [
  ['2024-01-29', '2024-04-28', 26044e6, 2025, 'Q1', '10-Q'],
  ['2024-04-29', '2024-07-28', 30040e6, 2025, 'Q2', '10-Q'],
  ['2024-07-29', '2024-10-27', 35082e6, 2025, 'Q3', '10-Q'],
  ['2024-10-28', '2025-01-26', 39331e6, 2025, 'FY', '10-K'],
  ['2025-01-27', '2025-04-27', 44062e6, 2026, 'Q1', '10-Q'],
  ['2025-04-28', '2025-07-27', 46743e6, 2026, 'Q2', '10-Q'],
  ['2025-07-28', '2025-10-26', 57044e6, 2026, 'Q3', '10-Q'],
  ['2025-10-27', '2026-01-25', 68100e6, 2026, 'FY', '10-K'],
  ['2026-01-26', '2026-04-26', 79500e6, 2027, 'Q1', '10-Q'],
  ['2026-04-27', '2026-07-26', 96200e6, 2027, 'Q2', '10-Q'],
];
const hechosRev: unknown[] = [];
for (const [start, end, val, fy, fp, form] of trimestres) {
  if (form === '10-K') {
    // El 10-K solo trae el anual; el 4.º trimestre se deriva.
    const anioIni = trimestres.find((t) => t[3] === fy && t[4] === 'Q1');
    const prev = trimestres.filter((t) => t[3] === fy && t[4] !== 'FY');
    const anual = prev.reduce((s, t) => s + t[2], 0) + val;
    hechosRev.push({ start: anioIni ? anioIni[0] : start, end, val: anual, fy, fp: 'FY', form, filed: end.replace(/-\d\d-\d\d$/, '-03-01') });
  } else {
    hechosRev.push({ start, end, val, fy, fp, form, filed: end });
  }
}
escribir('sec', 'Revenues.json', { cik: 1045810, taxonomy: 'us-gaap', tag: 'Revenues', _fixture: 'SINTÉTICO (Q2 FY2027 y Q4 FY2026 son de prueba)', units: { USD: hechosRev } });
escribir('sec', 'GuaranteeObligationsMaximumExposure.json', {
  cik: 1045810, taxonomy: 'us-gaap', tag: 'GuaranteeObligationsMaximumExposure',
  units: { USD: [
    { end: '2026-01-25', val: 62000e6, fy: 2026, fp: 'FY', form: '10-K', filed: '2026-02-25' },
    { end: '2026-04-26', val: 85000e6, fy: 2027, fp: 'Q1', form: '10-Q', filed: '2026-05-28' },
    { end: '2026-07-26', val: 108500e6, fy: 2027, fp: 'Q2', form: '10-Q', filed: '2026-08-27' },
  ] },
});
escribir('sec', 'EntityCommonStockSharesOutstanding.json', {
  cik: 1045810, taxonomy: 'dei', tag: 'EntityCommonStockSharesOutstanding',
  units: { shares: [{ end: '2026-08-15', val: 24300000000, fy: 2027, fp: 'Q2', form: '10-Q', filed: '2026-08-27' }] },
});

// ================= Silicon Data (solo si MOCK_SILICON=1) =================
const sd: Record<string, string> = {};
for (const [f, v] of serie('SDH100RT', [['2025-11-20', 2.05], ['2026-03-02', 2.4], ['2026-08-20', 2.7], ['2026-10-20', 2.88], ['2026-11-20', 3.08]], { ruido: 0.01 })) sd[f] = v.toFixed(2);
sd['2026-11-21'] = '-1';
escribir('silicondata', 'h100.json', { data: { indexes: sd } });

console.log('Fixtures generados en', RAIZ);
