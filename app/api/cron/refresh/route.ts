import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const ETIQUETAS = ['yahoo', 'fred', 'polymarket', 'sec', 'silicondata', 'gpuAbierto', 'manual'];

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }
  for (const t of ETIQUETAS) {
    revalidateTag(t);
    revalidateTag(`snapshot-${t}`);
  }
  revalidatePath('/');
  return NextResponse.json({ ok: true, revalidadas: ETIQUETAS, en: new Date().toISOString() });
}
