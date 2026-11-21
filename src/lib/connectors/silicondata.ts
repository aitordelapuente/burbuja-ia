// Silicon Data (de pago). Sin clave no se llama: ok:false, error:"sin_clave" y se usa el CSV manual.
import 'server-only';
import { REVALIDATE, env } from '../config';
import { SiliconDataSchema } from '../schemas';
import { conCache, fetchConReintentos, leerFixture, ahoraIso } from './http';
import type { ConnectorResult, Punto } from '../types';

export function parsearSilicon(raw: unknown): Punto[] {
  const r = SiliconDataSchema.parse(raw);
  return Object.entries(r.data.indexes)
    .map(([date, v]) => ({ date: date.slice(0, 10), value: Number(v) }))
    .filter((p) => Number.isFinite(p.value) && p.value >= 0) // negativos = «aún no generado»
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function descargar(gpu: string): Promise<Punto[]> {
  if (env.mock()) return parsearSilicon(JSON.parse(await leerFixture('silicondata', `${gpu}.json`)));
  const out: Punto[] = [];
  const hoy = new Date();
  // Datos desde el 01/09/2024, por tramos de 365 días.
  let desde = new Date('2024-09-01T00:00:00Z');
  while (desde < hoy) {
    const hasta = new Date(Math.min(hoy.getTime(), desde.getTime() + 364 * 86400000));
    const res = await fetchConReintentos('https://api.silicondata.com/api/gpu-index/index', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.siliconKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gpu, index_version: 'neo', starting_date: desde.toISOString().slice(0, 10), ending_date: hasta.toISOString().slice(0, 10) }),
    });
    out.push(...parsearSilicon(await res.json()));
    desde = new Date(hasta.getTime() + 86400000);
  }
  return out;
}

export async function siliconData(gpu: string): Promise<ConnectorResult<Punto[]>> {
  if (!env.siliconKey() && !(env.mock() && process.env.MOCK_SILICON === '1')) {
    return { ok: false, error: 'sin_clave', source: 'silicondata', fetchedAt: ahoraIso() };
  }
  return conCache('silicondata', [gpu], REVALIDATE.silicondata, () => descargar(gpu));
}
