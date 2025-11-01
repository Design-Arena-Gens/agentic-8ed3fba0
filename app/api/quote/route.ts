import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/data';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  try {
    const q = await getQuote(symbol);
    return NextResponse.json(q, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to fetch' }, { status: 500 });
  }
}
