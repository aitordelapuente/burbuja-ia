// FRED: fredgraph.csv sin clave (o la API oficial si hay FRED_API_KEY).
import 'server-only';
import { z } from 'zod';
import { REVALIDATE, env } from '../config';
import { conCache, fetchConReintentos, leerFixture } from './http';
import type { ConnectorResult, Punto } from '../types';

/** CSV `observation_date,VALOR`: los valores «.» o vacíos son nulos (se descartan del array de puntos). */
export function parsearFredCsv(csv: string): Array<{ date: string; value: number | null }> {
  const lineas = csv.trim().split(/\r?\n/);
  if (!lineas.length || !/date/i.test(lineas[0])) throw new Error('CSV de FRED sin cabecera');
  return lineas.slice(1).map((l) => {
    const [date, v] = l.split(',');
    const s = (v ?? '').trim();
    const n = s === '' || s === '.' ? null : Number(s);
    return { date: date.trim(), value: n !== null && Number.isFinite(n) ? n : null };
  });
}

const FredApiSchema = z.object({ observations: z.array(z.object({ date: z.string(), value: z.string() })) });

async function descargar(serie: string): Promise<Punto[]> {
  let filas: Array<{ date: string; value: number | null }>;
  if (env.mock()) filas = parsearFredCsv(await leerFixture('fred', `${serie}.csv`));
  else if (env.fredKey()) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${serie}&api_key=${env.fredKey()}&file_type=json`;
    const j = FredApiSchema.parse(await (await fetchConReintentos(url)).json());
    filas = j.observations.map((o) => ({ date: o.date, value: o.value === '.' || o.value === '' ? null : Number(o.value) }));
  } else {
    const res = await fetchConReintentos(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${serie}`, { headers: { 'User-Agent': env.userAgent() } });
    filas = parsearFredCsv(await res.text());
  }
  return filas.filter((f): f is Punto => f.value !== null);
}

export function fred(serie: string): Promise<ConnectorResult<Punto[]>> {
  return conCache('fred', [serie], REVALIDATE.fred, () => descargar(serie));
}
