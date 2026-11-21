// SEC EDGAR XBRL companyconcept (User-Agent obligatorio).
import 'server-only';
import { REVALIDATE, SEC, env } from '../config';
import { SecConceptSchema } from '../schemas';
import { conCache, fetchConReintentos, leerFixture } from './http';
import type { ConnectorResult } from '../types';

export interface HechoSec {
  start?: string;
  end: string;
  val: number;
  fy: number | null;
  fp: string | null;
  form: string;
  filed: string;
}

/** Deduplica por end + fp quedándose con el `filed` más reciente. */
export function parsearConcepto(raw: unknown, unidad = 'USD'): HechoSec[] {
  const c = SecConceptSchema.parse(raw);
  const lista = c.units[unidad] ?? Object.values(c.units)[0] ?? [];
  const mapa = new Map<string, HechoSec>();
  for (const h of lista) {
    const k = `${h.start ?? ''}|${h.end}|${h.fp ?? ''}`;
    const prev = mapa.get(k);
    if (!prev || h.filed > prev.filed) mapa.set(k, { start: h.start, end: h.end, val: h.val, fy: h.fy ?? null, fp: h.fp ?? null, form: h.form, filed: h.filed });
  }
  return Array.from(mapa.values()).sort((a, b) => a.end.localeCompare(b.end));
}

const dias = (a: string, b: string) => (new Date(a).getTime() - new Date(b).getTime()) / 86400000;

/** Ingresos trimestrales: entradas 10-Q/10-K de ~90 días; el 4.º trimestre = anual − 3 trimestres. */
export function trimestrales(hechos: HechoSec[]): Array<{ end: string; start: string; val: number; fy: number | null; fp: string | null }> {
  const validos = hechos.filter((h) => (h.form === '10-Q' || h.form === '10-K') && h.start);
  const q = validos.filter((h) => {
    const d = dias(h.end, h.start!);
    return d >= 80 && d <= 100;
  });
  const out = new Map<string, { end: string; start: string; val: number; fy: number | null; fp: string | null }>();
  for (const h of q) out.set(h.end, { end: h.end, start: h.start!, val: h.val, fy: h.fy, fp: h.fp });
  const anuales = validos.filter((h) => {
    const d = dias(h.end, h.start!);
    return d >= 350 && d <= 380;
  });
  for (const a of anuales) {
    if (out.has(a.end)) continue;
    const dentro = Array.from(out.values()).filter((x) => x.start >= a.start! && x.end < a.end);
    if (dentro.length === 3) {
      const ult = dentro.sort((x, y) => x.end.localeCompare(y.end))[2];
      const start = new Date(new Date(ult.end).getTime() + 86400000).toISOString().slice(0, 10);
      out.set(a.end, { end: a.end, start, val: a.val - dentro.reduce((s, x) => s + x.val, 0), fy: a.fy, fp: 'Q4' });
    }
  }
  return Array.from(out.values()).sort((a, b) => a.end.localeCompare(b.end));
}

async function descargar(taxonomia: string, concepto: string): Promise<HechoSec[]> {
  if (env.mock()) return parsearConcepto(JSON.parse(await leerFixture('sec', `${concepto}.json`)), concepto === 'EntityCommonStockSharesOutstanding' ? 'shares' : 'USD');
  const url = `${SEC.base}CIK${SEC.cikNvda}/${taxonomia}/${concepto}.json`;
  const res = await fetchConReintentos(url, { headers: { 'User-Agent': env.secUserAgent(), Accept: 'application/json' } });
  return parsearConcepto(await res.json(), concepto === 'EntityCommonStockSharesOutstanding' ? 'shares' : 'USD');
}

export function secConcepto(taxonomia: 'us-gaap' | 'dei', concepto: string): Promise<ConnectorResult<HechoSec[]>> {
  return conCache('sec', [taxonomia, concepto], REVALIDATE.sec, () => descargar(taxonomia, concepto));
}
