"use client";

import { useEffect, useState } from "react";

type Row = { symbol: string; change: number };
type Sector = { name: string; change: number; breadth: number; leaders: Row[] };
type Data = { sectors: Sector[]; meme: { breadth: number; leaders: Row[] }; source?: string };

export default function SectorRadar() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/sectors", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const next = await response.json();
        if (mounted) {
          setData(next);
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
