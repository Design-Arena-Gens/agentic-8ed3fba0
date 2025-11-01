"use client";

import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  marketTime?: string;
};

type HistoryPoint = { date: string; close: number };

type Allocation = { symbol: string; weight: number };

type OptimizationResponse = {
  allocations: Allocation[];
  expectedReturn: number;
  expectedVolatility: number;
  rationale: string;
};

const DEFAULT_TICKERS = ["VTI", "VOO", "AAPL", "MSFT", "NVDA", "AMZN", "BND", "IAU", "TLT"];

export default function HomePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const [risk, setRisk] = useState(0.6);
  const [universe, setUniverse] = useState(DEFAULT_TICKERS.join(","));
  const [opt, setOpt] = useState<OptimizationResponse | null>(null);
  const [agentInput, setAgentInput] = useState("");
  const [agentReply, setAgentReply] = useState("");

  async function fetchQuote(sym: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      setQuote(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory(sym: string) {
    const res = await fetch(`/api/history?symbol=${encodeURIComponent(sym)}&range=1y`);
    const data = await res.json();
    setHistory(data.points);
  }

  async function runOptimization() {
    setOpt(null);
    const symbols = universe.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, risk })
    });
    const data = await res.json();
    setOpt(data);
  }

  useEffect(() => {
    fetchQuote(symbol);
    fetchHistory(symbol);
  }, []);

  const chartData = useMemo(() => {
    return {
      labels: history.map(p => p.date),
      datasets: [
        {
          label: `${symbol} Close`,
          data: history.map(p => p.close),
          borderColor: '#111827',
          backgroundColor: 'rgba(17,24,39,0.08)',
          tension: 0.2
        }
      ]
    } as const;
  }, [history, symbol]);

  function prettyPct(x: number) {
    return (x * 100).toFixed(2) + '%';
  }

  function onAgentSend() {
    // Heuristic deterministic agent
    const text = agentInput.toLowerCase();
    const riskSignal = text.includes('aggressive') ? 0.85 : text.includes('conservative') || text.includes('retire') ? 0.35 : 0.6;
    const horizonYears = text.includes('short') ? 1 : text.includes('medium') ? 5 : 10;
    const notes = [
      `Interpreted risk tolerance: ${Math.round(riskSignal*100)}%`,
      `Investment horizon: ~${horizonYears} years`,
      `Strategy: core index funds with satellite growth and duration-balanced bonds`,
    ];
    setRisk(riskSignal);
    setAgentReply(notes.join('\n'));
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Investment Agent</h1>
        <div className="badge">Demo ? No investment advice</div>
      </div>

      <div className="row">
        <div className="col">
          <div className="card">
            <h2>Ticker Search</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="input" placeholder="AAPL, MSFT, VTI..." value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} />
              <button className="button" onClick={() => { fetchQuote(symbol); fetchHistory(symbol); }}>Load</button>
            </div>
            {loading ? <div className="small" style={{ marginTop: 8 }}>Loading...</div> : null}
            {quote && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{quote.symbol}</div>
                  <div style={{ fontSize: 22 }}>${quote.price.toFixed(2)}</div>
                  <div className="badge" style={{ borderColor: quote.change >= 0 ? '#16a34a' : '#dc2626', color: quote.change >= 0 ? '#16a34a' : '#dc2626' }}>
                    {quote.change.toFixed(2)} ({prettyPct(quote.changePercent/100)})
                  </div>
                </div>
                <div className="small">{quote.currency ?? 'USD'} ? {quote.marketTime}</div>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Line data={chartData as any} options={{ plugins: { legend: { display: false } }, scales: { x: { display: false } } }} />
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h2>Agent</h2>
            <textarea className="input" rows={4} placeholder="Describe goals, risk tolerance, horizon..." value={agentInput} onChange={e => setAgentInput(e.target.value)} />
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="button" onClick={onAgentSend}>Analyze</button>
            </div>
            {agentReply && (
              <pre className="card" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{agentReply}</pre>
            )}
          </div>

          <div className="card">
            <h2>Portfolio Builder</h2>
            <div className="small">Universe (comma separated)</div>
            <input className="input" value={universe} onChange={e => setUniverse(e.target.value)} />
            <div style={{ marginTop: 8 }}>
              <div className="small">Risk preference: {Math.round(risk*100)}%</div>
              <input type="range" min={0.1} max={0.95} step={0.05} value={risk} onChange={e => setRisk(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="button" onClick={runOptimization}>Optimize</button>
              <button className="button secondary" style={{ marginLeft: 8 }} onClick={() => setOpt(null)}>Reset</button>
            </div>
            {opt && (
              <div className="grid" style={{ marginTop: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Allocations</h3>
                  {opt.allocations.map(a => (
                    <div key={a.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <div>{a.symbol}</div>
                      <div>{prettyPct(a.weight)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Stats</h3>
                  <div>Expected return: {prettyPct(opt.expectedReturn)}</div>
                  <div>Expected volatility: {prettyPct(opt.expectedVolatility)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: 0 }}>Rationale</h3>
                  <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{opt.rationale}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
