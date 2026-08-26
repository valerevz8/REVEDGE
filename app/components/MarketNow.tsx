"use client";

import { useEffect, useState } from "react";

type MarketCoin = { symbol: string; price: number; change: number; sparkline?: number[] };
type MarketData = { coins: MarketCoin[]; total2: number; total2Change: number; total3: number; total3Change: number };

const fallback: MarketData = {
  coins: [
    { symbol: "BTC", price: 0, change: 0, sparkline: [] },
    { symbol: "ETH", price: 0, change: 0, sparkline: [] },
    { symbol: "SOL", price: 0, change: 0, sparkline: [] },
  ],
  total2: 0,
  total2Change: 0,
  total3: 0,
  total3Change: 0,
};

function formatPrice(price: number) {
  if (!price) return "—";
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 5 })}`;
}

function formatCap(value: number) {
  if (!value) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  return `$${(value / 1e9).toFixed(0)}B`;
}

function Change({ value }: { value: number }) {
  return <div className={value >= 0 ? "up" : "down"}>{value >= 0 ? "+" : ""}{value.toFixed(2)}%</div>;
}

function Sparkline({ values, positive }: { values?: number[]; positive: boolean }) {
  if (!values || values.length < 2) return <span className="spark-empty" aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 30 - ((value - min) / range) * 25;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg className={`sparkline ${positive ? "" : "spark-down"}`} viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketNow() {
  const [market, setMarket] = useState(fallback);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) throw new Error("market request failed");
        const data = await res.json();
        if (mounted) {
          setMarket(data);
          setUpdated(true);
        }
      } catch {
        // Keep the last good snapshot rather than showing invented values.
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const rows = [
    ...market.coins.map((coin) => ({ symbol: coin.symbol, price: formatPrice(coin.price), change: coin.change, sparkline: coin.sparkline })),
    { symbol: "TOTAL2", price: formatCap(market.total2), change: market.total2Change, sparkline: [] },
    { symbol: "TOTAL3", price: formatCap(market.total3), change: market.total3Change, sparkline: [] },
  ];

  return (
    <div className="market" id="market">
      <div className="markethead">
        <span className="label">Market Pulse</span>
        <span className="regime">● LIVE {updated ? "· 15s" : ""}</span>
      </div>
      <div className="coins">
        {rows.map((row) => (
          <div className="coin" key={row.symbol}>
            <b>{row.symbol}</b>
            <strong>{row.price}</strong>
            <Sparkline values={row.sparkline} positive={row.change >= 0} />
            <Change value={row.change} />
          </div>
        ))}
      </div>
    </div>
  );
}
