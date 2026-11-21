// Yahoo chart v8 (no oficial). Cierres diarios `close` (ajustados por splits, no por dividendos — D4).
import 'server-only';
import { REVALIDATE, env } from '../config';
import { YahooChartSchema, type YahooChart } from '../schemas';
import { conCache, fetchConReintentos, leerFixture } from './http';
import type { ConnectorResult } from '../types';

export interface SerieYahoo {
  symbol: string;
  currency: string | null;
  points: Array<{ date: string; close: number }>;
}

const fechaEnZona = (ts: number, zona: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts * 1000));

/** Convierte la respuesta cruda de Yahoo en puntos {date, close}, descartando close nulo. */
export function parsearYahoo(raw: unknown): SerieYahoo {
  const r = YahooChartSchema.parse(raw) as YahooChart;
  const res = r.chart.result?.[0];
  if (!res) throw new Error('respuesta sin resultados');
  const zona = res.meta.exchangeTimezoneName;
  const ts = res.timestamp ?? [];
  const closes = res.indicators.quote[0]?.close ?? [];
  const porFecha = new Map<string, number>();
  ts.forEach((t, i) => {
    const c = closes[i];
    if (c === null || c === undefined || !Number.isFinite(c)) return;
    porFecha.set(fechaEnZona(t, zona), c);
  });
  const points = Array.from(porFecha.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, close]) => ({ date, close }));
  return { symbol: res.meta.symbol, currency: res.meta.currency ?? null, points };
}

export const nombreFixtureYahoo = (s: string) => `${s.replace(/[^A-Za-z0-9.]/g, '_')}.json`;

async function descargar(symbol: string): Promise<SerieYahoo> {
  if (env.mock()) return parsearYahoo(JSON.parse(await leerFixture('yahoo', nombreFixtureYahoo(symbol))));
  const enc = encodeURIComponent(symbol);
  const now = Math.floor(Date.now() / 1000);
  const ruta = `/v8/finance/chart/${enc}?period1=0&period2=${now}&interval=1d&events=split`;
  const headers = { 'User-Agent': env.userAgent() };
  let ultimo: Error | null = null;
  for (const host of ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']) {
    try {
      const res = await fetchConReintentos(host + ruta, { headers });
      return parsearYahoo(await res.json());
    } catch (e) {
      ultimo = e as Error;
    }
  }
  throw ultimo ?? new Error('fallo desconocido');
}

export function yahoo(symbol: string): Promise<ConnectorResult<SerieYahoo>> {
  return conCache('yahoo', [symbol], REVALIDATE.yahoo, () => descargar(symbol));
}
