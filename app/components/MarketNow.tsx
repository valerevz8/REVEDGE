"use client";

import { useEffect, useState } from "react";

type MarketCoin = { symbol: string; price: number; change: number };
type MarketData = { coins: MarketCoin[]; total2: number; total2Change: number; total3: number; total3Change: number };

const fallback: MarketData = {
  coins: [
    { symbol: "BTC", price: 0, change: 0 },
    { symbol: "ETH", price: 0, change: 0 },
    { symbol: "SOL", price: 0, change: 0 },
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

  return (
    <div className="market" id="market">
      <div className="markethead">
        <span className="label">Market Pulse</span>
        <span className="regime">● LIVE {updated ? "· 15s" : ""}</span>
      </div>
      <div className="coins">
        {market.coins.map((coin) => (
          <div className="coin" key={coin.symbol}>
            <b>{coin.symbol}</b>
            <strong>{formatPrice(coin.price)}</strong>
            <Change value={coin.change} />
          </div>
        ))}
        <div className="coin">
          <b>TOTAL2</b>
          <strong>{formatCap(market.total2)}</strong>
          <Change value={market.total2Change} />
        </div>
        <div className="coin">
          <b>TOTAL3</b>
          <strong>{formatCap(market.total3)}</strong>
          <Change value={market.total3Change} />
        </div>
      </div>
    </div>
  );
}
