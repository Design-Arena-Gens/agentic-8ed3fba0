import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/data';
import { computeDailyReturns, inverseVolatilityWeights, lowestVolatilitySubset, portfolioStats } from '@/lib/portfolio';

export async function POST(req: Request) {
  try {
    const { symbols, risk } = await req.json();
    const syms: string[] = Array.isArray(symbols) && symbols.length > 0 ? symbols.map((s: string) => s.toUpperCase()) : ['VTI','BND','IAU'];
    const riskPref: number = typeof risk === 'number' ? Math.min(0.95, Math.max(0.1, risk)) : 0.6;

    const histories = await Promise.all(syms.map(async s => ({ s, h: await getHistory(s) })));
    const returns: Record<string, number[]> = Object.fromEntries(histories.map(({ s, h }) => [s, computeDailyReturns(h)]));
    const vols: Record<string, number> = Object.fromEntries(Object.entries(returns).map(([s, r]) => [s, r.length ? Math.max(1e-6, r.reduce((acc, x) => acc + (x - (r.reduce((a,b)=>a+b,0)/r.length))**2, 0) / r.length) ** 0.5 : 0.2]));

    const inv = inverseVolatilityWeights(vols);
    const low = inverseVolatilityWeights(lowestVolatilitySubset(vols, Math.max(2, Math.floor(syms.length/3))))
    const weights = Object.fromEntries(syms.map(s => [s, (inv[s] ?? 0) * riskPref + (low[s] ?? 0) * (1 - riskPref)]));
    const sum = Object.values(weights).reduce((a,b)=>a+b,0) || 1;
    for (const k of Object.keys(weights)) weights[k] = weights[k] / sum;

    const stats = portfolioStats(weights, returns);

    const rationale = [
      `Inverse-volatility core blended with low-vol subset based on risk ${Math.round(riskPref*100)}%.`,
      `Universe: ${syms.join(', ')}.`,
      `Objective: diversify across uncorrelated assets and downweight volatile names.`
    ].join('\n');

    const allocations = Object.entries(weights).map(([symbol, weight]) => ({ symbol, weight })).sort((a,b)=>b.weight-a.weight);

    return NextResponse.json({ allocations, expectedReturn: stats.expectedReturn, expectedVolatility: stats.expectedVolatility, rationale });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to optimize' }, { status: 500 });
  }
}
