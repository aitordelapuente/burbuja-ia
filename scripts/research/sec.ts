// Ayudas para SEC EDGAR (submissions e índices de presentaciones). Requiere SEC_USER_AGENT.
import { pedir, pedirJson, UA_SEC } from '../lib/http';

export interface Presentacion {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate: string;
  items: string[];
  primaryDocument: string;
}

export const urlSubmissions = (cik10: string) => `https://data.sec.gov/submissions/CIK${cik10}.json`;
export const sinGuiones = (acc: string) => acc.replace(/-/g, '');
export const cikNumero = (cik10: string) => String(Number(cik10));
export const urlIndice = (cik10: string, acc: string) => `https://www.sec.gov/Archives/edgar/data/${cikNumero(cik10)}/${sinGuiones(acc)}/index.json`;
export const urlDocumento = (cik10: string, acc: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cikNumero(cik10)}/${sinGuiones(acc)}/${doc}`;

const cabecerasSec = () => ({ 'user-agent': UA_SEC(), accept: 'application/json, text/html' });

/** Lista de presentaciones recientes (filings.recent), en orden de fecha descendente. */
export function parsearSubmissions(json: unknown): Presentacion[] {
  const r = (json as { filings?: { recent?: Record<string, unknown[]> } })?.filings?.recent;
  if (!r || !Array.isArray(r.accessionNumber)) return [];
  const col = (k: string, i: number) => String((r[k] as unknown[] | undefined)?.[i] ?? '');
  return r.accessionNumber
    .map((_, i) => ({
      accessionNumber: col('accessionNumber', i),
      form: col('form', i),
      filingDate: col('filingDate', i),
      reportDate: col('reportDate', i),
      items: col('items', i)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      primaryDocument: col('primaryDocument', i),
    }))
    .sort((a, b) => b.filingDate.localeCompare(a.filingDate));
}

export async function presentaciones(cik10: string) {
  const r = await pedirJson(urlSubmissions(cik10), { headers: cabecerasSec() });
  return r.ok ? { ok: true as const, lista: parsearSubmissions(r.data) } : { ok: false as const, error: r.error };
}

export async function ficherosDeIndice(cik10: string, acc: string): Promise<string[]> {
  const r = await pedirJson<{ directory?: { item?: Array<{ name: string }> } }>(urlIndice(cik10, acc), { headers: cabecerasSec() });
  return r.ok ? (r.data.directory?.item ?? []).map((i) => i.name) : [];
}

export async function descargarSec(url: string) {
  return pedir(url, { headers: cabecerasSec() });
}
