import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/data';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  const range = searchParams.get('range') || '1y';
  try {
    const points = await getHistory(symbol);
    // slice to ~1y (252 trading days)
    const sliced = points.slice(-260);
    return NextResponse.json({ symbol: symbol.toUpperCase(), points: sliced }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to fetch' }, { status: 500 });
  }
}
