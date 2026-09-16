"use client";

import { useEffect, useMemo, useState } from "react";

type ComponentScore = { name: string; score: number; weight: number };
type Intelligence = {
  ok: boolean;
  observedAt: string;
  vex: { score: number; state: string; direction: "BULLISH" | "BEARISH" | "NEUTRAL"; components: ComponentScore[] };
  bias: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; bullishProbability: number; bearishProbability: number };
  scenarios: Array<{ id: string; label: string; probability: number; note: string }>;
  liquidity: { buyStops: number; sellStops: number; imbalance: number; buySideLevel: number; sellSideLevel: number; highClusters: number; lowClusters: number; sweepRisk: "LOW" | "MEDIUM" | "HIGH" };
  market: { btc: number; eth: number; sol: number; total3: number; dxy: number; yields10y: number; nasdaq: number; gold: number };
  checklist: Array<{ label: string; ok: boolean }>;
  decision: { phase: string; decision: string; tradeability: number; reversalRisk: "LOW" | "MEDIUM" | "HIGH"; thesisStatus: string; trigger: string; invalidation: string; transmissionRead: string };
  structure: { trendPct: number; positionPct: number; recentHigh: number; recentLow: number };
  reaction: { initial: string; note: string };
};

type Event = { title: string; category: string; impact: string; utcMs: number; wib: string };

const tone = (value: string) => value === "BULLISH" || value === "LONG" ? "var(--green)" : value === "BEARISH" || value === "SHORT" || value === "HIGH" ? "var(--red)" : value === "MEDIUM" || value === "WATCH" ? "var(--yellow)" : "var(--muted)";
const fmt = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const money = (n: number) => n >= 1000 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function HalverIntelligenceSuite() {
  const [data, setData] = useState<Intelligence | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const calendarResponse = await fetch("/api/calendar", { cache: "no-store" });
        const calendar = calendarResponse.ok ? await calendarResponse.json() : { events: [] };
        const fomc = (calendar.events ?? []).find((x: Event) => /FOMC Decision/i.test(x.title)) as Event | undefined;
        if (active) setEvent(fomc ?? null);
        const qs = fomc ? `?eventMs=${encodeURIComponent(String(fomc.utcMs))}` : "";
        const response = await fetch(`/api/halver/intelligence${qs}`, { cache: "no-store" });
        if (!response.ok) throw new Error("intelligence");
        const payload = await response.json();
        if (active && payload.ok) { setData(payload); setError(false); }
      } catch {
        if (active) setError(true);
      }
    };
    void load();
    const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const completed = useMemo(() => data?.checklist.filter((x) => x.ok).length ?? 0, [data]);
  const decisionColor = data ? tone(data.decision.decision) : "var(--muted)";

  if (!data) {
    if (error) return <section className="shell section" style={{ paddingTop: 8, paddingBottom: 8 }}><div className="halver-suite-error">HALVER intelligence is reconnecting. Live scoring will resume automatically.</div></section>;
    return null;
  }

  return <section className="shell section" style={{ paddingTop: 8, paddingBottom: 8 }} aria-label="HALVER intelligence suite">
    <style>{`
      .halver-suite{border:1px solid var(--line);border-radius:20px;background:var(--panel);overflow:hidden}
      .halver-suite-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:18px 20px 15px;border-bottom:1px solid var(--line)}
      .halver-suite-kicker{font-size:8px;font-weight:800;letter-spacing:.14em;color:var(--muted);text-transform:uppercase}
      .halver-suite-head h3{margin:5px 0 0;font-family:Manrope,sans-serif;font-size:19px;letter-spacing:-.045em}
      .halver-suite-stamp{text-align:right;color:var(--muted);font-size:8px;line-height:1.5}
      .halver-suite-stamp b{display:block;margin-top:3px;font-size:9px;color:var(--text)}
      .halver-suite-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}
      .halver-suite-card{background:var(--panel);padding:18px 20px;min-width:0}
      .halver-suite-card.full{grid-column:1/-1}
      .halver-suite-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
      .halver-suite-title span{font-size:8px;font-weight:800;letter-spacing:.13em;color:var(--muted);text-transform:uppercase}
      .halver-suite-title b{font-size:8px;letter-spacing:.1em}
      .halver-vex{display:grid;grid-template-columns:145px 1fr;gap:18px;align-items:center}
      .halver-vex-score strong{font-family:Manrope,sans-serif;font-size:54px;line-height:.9;letter-spacing:-.07em}
      .halver-vex-score small{display:block;margin-top:7px;color:var(--muted);font-size:8px;letter-spacing:.1em;font-weight:800}
      .halver-bar{height:5px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:8px}
      .halver-bar i{display:block;height:100%;background:var(--gold-soft);border-radius:inherit}
      .halver-score-row{display:grid;grid-template-columns:1fr 40px;gap:10px;align-items:center;margin:7px 0;font-size:8px}
      .halver-score-row b{text-align:right;font-size:8px}
      .halver-score-row .halver-bar{margin-top:0;height:3px}
      .halver-score-row .halver-bar i{background:var(--text);opacity:.72}
      .halver-scenarios{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
      .halver-scenario{border:1px solid var(--line);border-radius:12px;padding:11px}
      .halver-scenario b{display:block;font-family:Manrope,sans-serif;font-size:20px;letter-spacing:-.04em}
      .halver-scenario span{display:block;margin-top:4px;font-size:8px;font-weight:800;line-height:1.3}
      .halver-scenario p{margin:7px 0 0;color:var(--muted);font-size:8px;line-height:1.45}
      .halver-scenario:nth-child(1) b{color:var(--green)}.halver-scenario:nth-child(2) b{color:var(--yellow)}.halver-scenario:nth-child(3) b{color:var(--red)}
      .halver-liq{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .halver-stat{border:1px solid var(--line);border-radius:12px;padding:11px}
      .halver-stat span{display:block;font-size:7px;color:var(--muted);font-weight:800;letter-spacing:.1em;text-transform:uppercase}
      .halver-stat strong{display:block;margin-top:5px;font-family:Manrope,sans-serif;font-size:17px;letter-spacing:-.035em}
      .halver-stat small{display:block;margin-top:4px;color:var(--muted);font-size:7px}
      .halver-liq-meter{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:10px}
      .halver-liq-line{height:6px;border-radius:99px;background:linear-gradient(90deg,var(--red) 0 50%,var(--green) 50%);position:relative;opacity:.65}
      .halver-liq-pin{position:absolute;top:50%;width:12px;height:12px;border:2px solid var(--text);background:var(--panel);border-radius:50%;transform:translate(-50%,-50%)}
      .halver-liq-labels{display:flex;justify-content:space-between;margin-top:6px;font-size:7px;color:var(--muted);font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .halver-heat{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
      .halver-heat-cell{border:1px solid var(--line);border-radius:10px;padding:9px 7px;text-align:center}
      .halver-heat-cell span{display:block;font-size:7px;color:var(--muted);font-weight:800;letter-spacing:.07em}
      .halver-heat-cell b{display:block;margin-top:5px;font-size:9px}
      .halver-check{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .halver-check-row{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:8px 9px;font-size:8px}
      .halver-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto;border:1px solid var(--muted)}
      .halver-dot.ok{background:var(--green);border-color:var(--green)}
      .halver-check-summary{margin-top:9px;color:var(--muted);font-size:8px}
      .halver-event{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}
      .halver-timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:12px}
      .halver-time{border-top:2px solid var(--line);padding-top:7px;font-size:7px;color:var(--muted);line-height:1.4}
      .halver-time b{display:block;color:var(--text);font-size:8px;margin-bottom:3px}
      .halver-response{border:1px solid var(--line);border-radius:12px;padding:11px;background:color-mix(in srgb,var(--panel) 94%,var(--gold-soft) 6%)}
      .halver-response strong{display:block;font-family:Manrope,sans-serif;font-size:15px;letter-spacing:-.03em}
      .halver-response p{margin:5px 0 0;color:var(--muted);font-size:8px;line-height:1.5}
      .halver-suite-error{border:1px solid var(--line);border-radius:14px;padding:14px 18px;color:var(--muted);font-size:9px}
      @media(max-width:900px){.halver-suite-grid{grid-template-columns:1fr}.halver-suite-card.full{grid-column:auto}.halver-heat{grid-template-columns:repeat(4,1fr)}}
      @media(max-width:600px){.halver-vex{grid-template-columns:1fr}.halver-scenarios{grid-template-columns:1fr}.halver-check{grid-template-columns:1fr}.halver-event{grid-template-columns:1fr}.halver-suite-head{flex-direction:column}.halver-suite-stamp{text-align:left}}
    `}</style>

    <div className="halver-suite">
      <div className="halver-suite-head">
        <div><div className="halver-suite-kicker">HALVER INTELLIGENCE · LIVE</div><h3>Decision Intelligence</h3></div>
        <div className="halver-suite-stamp">{event?.wib ?? "LIVE MARKET"}<b>{data.decision.phase.replace("_", " ")}</b></div>
      </div>

      <div className="halver-suite-grid">
        <div className="halver-suite-card">
          <div className="halver-suite-title"><span>VEX CONVICTION ENGINE</span><b style={{ color: tone(data.vex.state) }}>{data.vex.state}</b></div>
          <div className="halver-vex">
            <div className="halver-vex-score"><strong>{data.vex.score}</strong><small>/ 100 · {data.vex.direction}</small></div>
            <div>{data.vex.components.map((item) => <div className="halver-score-row" key={item.name}><div><span>{item.name}</span><div className="halver-bar"><i style={{ width: `${item.score}%` }} /></div></div><b>{Math.round(item.score)}</b></div>)}</div>
          </div>
        </div>

        <div className="halver-suite-card">
          <div className="halver-suite-title"><span>REACTION SCENARIOS</span><b>LIVE MODEL</b></div>
          <div className="halver-scenarios">{data.scenarios.map((s) => <div className="halver-scenario" key={s.id}><b>{s.probability}%</b><span>{s.label}</span><p>{s.note}</p></div>)}</div>
        </div>

        <div className="halver-suite-card">
          <div className="halver-suite-title"><span>LIQUIDITY RADAR · BTC</span><b style={{ color: tone(data.liquidity.sweepRisk) }}>{data.liquidity.sweepRisk} SWEEP RISK</b></div>
          <div className="halver-liq">
            <div className="halver-stat"><span>BUY-SIDE LIQUIDITY</span><strong>{money(data.liquidity.buySideLevel)}</strong><small>cluster strength {data.liquidity.buyStops}% · {data.liquidity.highClusters} cluster(s)</small></div>
            <div className="halver-stat"><span>SELL-SIDE LIQUIDITY</span><strong>{money(data.liquidity.sellSideLevel)}</strong><small>cluster strength {data.liquidity.sellStops}% · {data.liquidity.lowClusters} cluster(s)</small></div>
          </div>
          <div className="halver-liq-meter"><div className="halver-liq-line"><i className="halver-liq-pin" style={{ left: `${data.liquidity.buyStops / Math.max(1, data.liquidity.buyStops + data.liquidity.sellStops) * 100}%` }} /></div><div className="halver-liq-labels"><span>Sell Stops</span><span>Liquidity Balance</span><span>Buy Stops</span></div></div>
        </div>

        <div className="halver-suite-card">
          <div className="halver-suite-title"><span>MARKET HEALTH</span><b>24H · CROSS-ASSET</b></div>
          <div className="halver-heat">{([['BTC',data.market.btc],['ETH',data.market.eth],['SOL',data.market.sol],['TOTAL3',data.market.total3],['DXY',data.market.dxy],['US10Y',data.market.yields10y],['NASDAQ',data.market.nasdaq],['GOLD',data.market.gold]] as Array<[string,number]>).map(([label,value]) => <div className="halver-heat-cell" key={label}><span>{label}</span><b style={{ color: value > 0.15 ? "var(--green)" : value < -0.15 ? "var(--red)" : "var(--yellow)" }}>{fmt(value)}</b></div>)}</div>
          <div style={{ marginTop: 11, fontSize: 8, color: "var(--muted)" }}>{data.decision.transmissionRead}</div>
        </div>

        <div className="halver-suite-card">
          <div className="halver-suite-title"><span>EXECUTION CHECKLIST</span><b>{completed} / {data.checklist.length}</b></div>
          <div className="halver-check">{data.checklist.map((item) => <div className="halver-check-row" key={item.label}><i className={`halver-dot ${item.ok ? "ok" : ""}`} />{item.label}</div>)}</div>
          <div className="halver-check-summary">{completed >= 7 ? "Confirmation threshold reached." : `HALVER will not treat the setup as confirmed until ${Math.min(7, data.checklist.length)} / ${data.checklist.length} checks are satisfied.`}</div>
        </div>

        <div className="halver-suite-card">
          <div className="halver-suite-title"><span>REACTION QUALITY GATE</span><b style={{ color: decisionColor }}>{data.decision.decision}</b></div>
          <div className="halver-response"><strong style={{ color: decisionColor }}>{data.reaction.initial}</strong><p>{data.reaction.note}</p></div>
          <div className="halver-event" style={{ marginTop: 9 }}><div><div style={{ fontSize: 8, fontWeight: 800 }}>TRIGGER</div><div style={{ marginTop: 4, color: "var(--muted)", fontSize: 8, lineHeight: 1.45 }}>{data.decision.trigger}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 8, color: "var(--muted)" }}>TRADEABILITY</div><b style={{ fontFamily: "Manrope", fontSize: 22 }}>{data.decision.tradeability}%</b></div></div>
        </div>

        <div className="halver-suite-card full">
          <div className="halver-suite-title"><span>FOMC LIVE MODE · REACTION TIMELINE</span><b>{event?.title ?? "FOMC"}</b></div>
          <div className="halver-timeline"><div className="halver-time"><b>T−3H</b>Positioning + expectation</div><div className="halver-time"><b>T−0</b>Decision release</div><div className="halver-time"><b>+0–5M</b>Initial reaction</div><div className="halver-time"><b>+5–15M</b>Acceptance gate</div><div className="halver-time"><b>+15–60M</b>Transmission + thesis update</div></div>
          <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}><div style={{ fontSize: 8, color: "var(--muted)", lineHeight: 1.5 }}>HALVER does not treat the headline spike as the trade. It waits for acceptance, cross-asset transmission, and structure confirmation.</div><div style={{ textAlign: "right" }}><div style={{ fontSize: 7, color: "var(--muted)", letterSpacing: ".1em", fontWeight: 800 }}>THESIS</div><b style={{ fontSize: 10, color: tone(data.decision.thesisStatus) }}>{data.decision.thesisStatus}</b></div></div>
        </div>
      </div>
    </div>
  </section>;
}
