import { NextResponse, type NextRequest } from 'next/server';
import { buildSnapshot } from '@/lib/snapshot';
import { tablaSalud } from '@/lib/salud';

export const dynamic = 'force-dynamic';

/** 200 si al menos el 50 % de los conectores configurados están bien; si no, 503. */
export async function GET(req: NextRequest) {
  const detalle = req.nextUrl.searchParams.get('detalle') === '1';
  if (detalle) {
    const token = process.env.HEALTH_TOKEN;
    const auth = req.headers.get('authorization') ?? '';
    if (!token || auth !== `Bearer ${token}`) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }
  const s = await buildSnapshot();
  // Silicon Data sin clave no es un fallo: es una configuración opcional.
  const evaluables = s.salud.filter((c) => !(c.conector === 'silicondata' && c.error?.startsWith('sin_clave')));
  const ok = evaluables.filter((c) => c.ok).length;
  const sano = ok / Math.max(1, evaluables.length) >= 0.5;
  const cuerpo: Record<string, unknown> = {
    ok: sano,
    generadoEn: s.generadoEn,
    conectores: s.salud,
    reglasCambiadas: s.polymarket.reglasCambiadas,
    mercadoActivo: s.polymarket.principal !== null,
  };
  if (detalle) cuerpo.filas = tablaSalud(s);
  return NextResponse.json(cuerpo, { status: sano ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
