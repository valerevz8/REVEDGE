"use client";

import { useEffect, useState } from "react";

type Coin = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  icon: string;
  sparkline: number[];
};
type Row = { symbol: string; change: number };
type Sector = { name: string; change: number; breadth: number; leaders: Row[] };
type Data = { sectors: Sector[]; meme: { breadth: number; leaders: Row[] }; source?: string };

type MarketData = { coins: Coin[] };

function formatPrice(price: number) {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  return `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return <span className="spark-empty" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 30 - ((value - min) / range) * 25;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg className={`sparkline ${positive ? "spark-up" : "spark-down"}`} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SectorRadar() {
  const [data, setData] = useState<Data | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [sectorResponse, marketResponse] = await Promise.all([
          fetch("/api/sectors", { cache: "no-store" }),
          fetch("/api/market", { cache: "no-store" }),
        ]);
        if (!sectorResponse.ok || !marketResponse.ok) throw new Error("unavailable");
        const [next, nextMarket] = await Promise.all([sectorResponse.json(), marketResponse.json()]);
        if (mounted) {
          setData(next);
          setMarket(nextMarket);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  return (
    <>
      <section className="shell section" id="market-radar">
        <div className="sectiontitle">
          <div><div className="label">Market overview</div><h2>Top 5 Coins</h2></div>
          <span className="sub">Live · 30s · 24h performance</span>
        </div>
        <div className="topcoins card">
          {!market ? (
            <div className="newsempty">{error ? "Live market data unavailable · retrying" : "Loading live market data…"}</div>
          ) : market.coins.map((coin) => (
            <div className="topcoin" key={coin.symbol}>
              <div className="coinidentity">
                {coin.icon ? <img src={coin.icon} alt="" className="coinicon" /> : <span className="coinicon-fallback">{coin.symbol.slice(0, 1)}</span>}
                <div><b>{coin.symbol}</b><small>{coin.name}</small></div>
              </div>
              <Sparkline values={coin.sparkline} positive={coin.change >= 0} />
              <div className="coinquote"><strong>{formatPrice(coin.price)}</strong><span className={coin.change >= 0 ? "gain" : "loss"}>{coin.change >= 0 ? "+" : ""}{coin.change.toFixed(2)}%</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section" id="sectors">
        <div className="sectiontitle"><div><div className="label">Capital rotation</div><h2>Top 3 Sectors</h2></div><span className="sub">Live · 30s · breadth + relative strength</span></div>
        <div className="sectors card">
          {!data ? (
            <div className="newsempty">{error ? "REVEDGE could not reach the market data provider. Retrying automatically." : "Loading live sector data…"}</div>
          ) : data.sectors.map((sector, index) => (
            <div className="sector" key={sector.name}>
              <span className="rank">0{index + 1}</span>
              <div><b>{sector.name}</b><small>Breadth {sector.breadth}% · Leaders {sector.leaders.map((x) => x.symbol).join(", ")}</small></div>
              <span className={sector.change >= 0 ? "gain" : "loss"}>{sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section" id="meme-radar">
        <div className="sectiontitle"><div><div className="label">High-beta radar</div><h2>Meme Sector</h2></div><span className="sub">Live · 30s · {data?.meme?.breadth ?? 0}% breadth</span></div>
        <div className="card meme-card">
          <div className="meta meme-summary" style={{ marginTop: 0 }}>
            <span className="chip">MEME BREADTH {data?.meme?.breadth ?? 0}%</span>
            <span className="chip">Live market data</span>
          </div>
          <div className="meme-list">
            {!data ? <div className="newsempty">Loading live meme data…</div> : data.meme.leaders.map((row) => (
              <div className="meme-row" key={row.symbol}>
                <div><b>{row.symbol}</b><span>24h move</span></div>
                <div className="meme-track"><span style={{ width: `${Math.min(100, Math.abs(row.change) * 8 + 18)}%` }} /></div>
                <span className={row.change >= 0 ? "gain" : "loss"}>{row.change >= 0 ? "+" : ""}{row.change.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
