import { NextResponse } from 'next/server';
import { buildSnapshot } from '@/lib/snapshot';

export const revalidate = 900;

export async function GET() {
  const s = await buildSnapshot();
  return NextResponse.json(s, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' } });
}
