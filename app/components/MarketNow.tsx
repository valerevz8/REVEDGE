"use client";

import { useEffect, useState } from "react";

type MarketCoin = { symbol: string; price: number; change: number };

const fallback: MarketCoin[] = [
  { symbol: "BTC", price: 0, change: 0 },
  { symbol: "ETH", price: 0, change: 0 },
  { symbol: "SOL", price: 0, change: 0 },
];

function formatPrice(price: number) {
  if (!price) return "—";
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 5 })}`;
}

export default function MarketNow() {
  const [coins, setCoins] = useState(fallback);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) throw new Error("market request failed");
        const data = await res.json();
        if (mounted) {
          setCoins(data.coins);
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
        <span className="label">Market now</span>
        <span className="regime">● LIVE {updated ? "· 15s" : ""}</span>
      </div>
      <div className="coins">
        {coins.map((coin) => (
          <div className="coin" key={coin.symbol}>
            <b>{coin.symbol}</b>
            <strong>{formatPrice(coin.price)}</strong>
            <div className={coin.change >= 0 ? "up" : "down"}>
              {coin.change >= 0 ? "+" : ""}{coin.change.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
