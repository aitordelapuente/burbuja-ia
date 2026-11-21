// Polymarket: Gamma (eventos y mercados) y CLOB (histórico de precios).
import 'server-only';
import { POLYMARKET, REVALIDATE, env } from '../config';
import { PolymarketEventsSchema, PolymarketHistorySchema } from '../schemas';
import { conCache, fetchConReintentos, leerFixture } from './http';
import type { ConnectorResult, Punto } from '../types';

export interface MercadoPM {
  slug: string;
  titulo: string;
  fin: string;
  cerrado: boolean;
  probSi: number | null;
  volumen: number | null;
  tokenSi: string | null;
  precios: number[] | null;
  outcomes: string[];
}
export interface EventoPM {
  slug: string;
  titulo: string;
  descripcion: string | null;
  mercados: MercadoPM[];
}

const n = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Parsea la respuesta de Gamma. `outcomes`, `outcomePrices` y `clobTokenIds` llegan como strings JSON. */
export function parsearGamma(raw: unknown): EventoPM[] {
  const evs = PolymarketEventsSchema.parse(raw);
  return evs.map((e) => ({
    slug: e.slug,
    titulo: e.title ?? e.slug,
    descripcion: e.description ?? null,
    mercados: e.markets.map((m) => {
      const iSi = m.outcomes.findIndex((o) => o.toLowerCase() === 'yes');
      const precios = m.outcomePrices ? m.outcomePrices.map((p) => Number(p)) : null;
      const prob = iSi >= 0 && precios && Number.isFinite(precios[iSi]) ? precios[iSi] : n(m.lastTradePrice);
      return {
        slug: m.slug,
        titulo: m.question ?? m.slug,
        fin: (m.endDate ?? '').slice(0, 10),
        cerrado: m.closed === true,
        probSi: prob,
        volumen: n(m.volume),
        tokenSi: iSi >= 0 && m.clobTokenIds ? (m.clobTokenIds[iSi] ?? null) : null,
        precios,
        outcomes: m.outcomes,
      };
    }),
  }));
}

export function parsearHistorial(raw: unknown): Punto[] {
  const h = PolymarketHistorySchema.parse(raw);
  const porDia = new Map<string, number>();
  for (const x of h.history) porDia.set(new Date(x.t * 1000).toISOString().slice(0, 10), x.p);
  return Array.from(porDia.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
}

async function descargarEvento(slug: string): Promise<EventoPM[]> {
  if (env.mock()) return parsearGamma(JSON.parse(await leerFixture('polymarket', `events-${slug}.json`)));
  const res = await fetchConReintentos(POLYMARKET.gamma + encodeURIComponent(slug), { headers: { 'User-Agent': env.userAgent() } });
  return parsearGamma(await res.json());
}

async function descargarHistorial(token: string): Promise<Punto[]> {
  if (env.mock()) return parsearHistorial(JSON.parse(await leerFixture('polymarket', `history-${token}.json`)));
  const url = `${POLYMARKET.clob}?market=${encodeURIComponent(token)}&interval=max&fidelity=1440`;
  const res = await fetchConReintentos(url, { headers: { 'User-Agent': env.userAgent() } });
  return parsearHistorial(await res.json());
}

export function polymarketEvento(slug: string): Promise<ConnectorResult<EventoPM[]>> {
  return conCache('polymarket', ['evento', slug], REVALIDATE.polymarket, () => descargarEvento(slug));
}
export function polymarketHistorial(token: string): Promise<ConnectorResult<Punto[]>> {
  return conCache('polymarket', ['historial', token], REVALIDATE.polymarket, () => descargarHistorial(token));
}
