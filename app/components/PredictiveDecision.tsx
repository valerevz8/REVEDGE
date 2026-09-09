"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "./Preferences";

type Predictive = {
  directionScore: number;
  executionScore: number;
  riskFlag: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskLabel: string;
  immediateRead: string;
  baseCase: string;
  riskCase: string;
  worstCase: string;
  confirmation: string[];
  invalidation: string[];
  why: string;
};

type IntelEvent = {
  title: string;
  direction: "Risk-on" | "Risk-off" | "Neutral";
  bias: string;
  regime: string;
  impact: number;
  lifecycle: string;
  predictive?: Predictive;
};

type CalendarEvent = {
  title: string;
  category: string;
  impact: "HIGH" | "MEDIUM";
  note: string;
  wib: string;
  et: string;
  uk: string;
  utcMs: number;
};

type MarketCoin = { symbol: string; price: number; change: number };
type Market = { coins: MarketCoin[]; total3Change: number };

type Bias = "Risk-on" | "Risk-off" | "Neutral";

const ID: Record<string, string> = {
  "PREDICTIVE RADAR": "RADAR PREDIKSI",
  "PRE-EVENT RADAR": "RADAR PRE-EVENT",
  "CURRENT BIAS": "BIAS MARKET SAAT INI",
  "NEXT CATALYST": "KATALIS BERIKUTNYA",
  "DIRECTION": "ARAH MARKET",
  "EXECUTION": "KELAYAKAN ENTRY",
  "RISK FLAG": "RISIKO UTAMA",
  "LIQUIDITY RISK": "RISIKO LIKUIDITAS",
  "MARKET STRUCTURE": "STRUKTUR MARKET",
  "BASE CASE": "SKENARIO UTAMA",
  "RISK CASE": "SKENARIO RISIKO",
  "WORST CASE": "SKENARIO TERBURUK",
  "CONFIRMATION": "KONFIRMASI",
  "INVALIDATION": "INVALIDASI",
  "ACTION NOW": "AKSI SEKARANG",
  "MODEL STATE": "STATUS MODEL",
  "PREPARE": "BERSIAP",
  "WAIT": "TUNGGU",
  "TRADEABLE": "LAYAK DITRADE",
  "NO EDGE": "BELUM ADA EDGE",
  "WAIT FOR CONFIRMATION": "TUNGGU KONFIRMASI",
  "REDUCE RISK / WAIT FOR CONFIRMATION": "KURANGI RISIKO / TUNGGU KONFIRMASI",
  "NO EDGE — WAIT": "BELUM ADA EDGE — TUNGGU",
  "LIQUIDITY_SWEEP": "LIQUIDITY SWEEP",
  "BREAKOUT_TRAP": "BREAKOUT TRAP",
  "MACRO_HEADWIND": "TEKANAN MAKRO",
  "EVENT_WHIPSAW": "WHIPSAW SAAT EVENT",
  "HIGH": "TINGGI",
  "MEDIUM": "SEDANG",
  "LOW": "RENDAH",
  "Risk-on": "Risk-on",
  "Risk-off": "Risk-off",
  "Neutral": "Netral",
  "Bullish": "Bullish",
  "Bearish": "Bearish",
  "Mixed": "Campuran",
  "CONFIRMATION REQUIRED": "WAJIB KONFIRMASI",
  "BULLISH, BUT ENTRY NOT YET SAFE": "BULLISH, TAPI ENTRY BELUM AMAN",
  "BEARISH, BUT WAIT FOR REACTION": "BEARISH, TAPI TUNGGU REAKSI",
  "MIXED — NO EDGE YET": "CAMPURAN — BELUM ADA EDGE",
  "BTC LEADS": "BTC MEMIMPIN",
  "BREADTH CONFIRMS": "BREADTH MENGONFIRMASI",
  "BREADTH DIVERGES": "BREADTH MENYIMPANG",
  "EVENT RISK RISING": "RISIKO EVENT MENINGKAT",
  "hours": "jam",
  "days": "hari",
  "TODAY": "HARI INI",
};

function tr(value: string, id: boolean) {
  return id ? (ID[value] ?? value) : value;
}

function tone(direction: Bias) {
  if (direction === "Risk-on") return { accent: "var(--green)", bg: "rgba(117,215,154,.07)" };
  if (direction === "Risk-off") return { accent: "var(--red)", bg: "rgba(231,125,125,.07)" };
  return { accent: "var(--yellow)", bg: "rgba(217,189,115,.07)" };
}

function countdown(ms: number, id: boolean) {
  const diff = Math.max(0, ms - Date.now());
  if (diff <= 0) return tr("TODAY", id);
  const totalHours = Math.floor(diff / 3600000);
  if (totalHours >= 24) {
    const d = Math.floor(totalHours / 24);
    const h = totalHours % 24;
    return id ? `${d}h ${h}j` : `${d}d ${h}h`;
  }
  const h = totalHours;
  const m = Math.floor((diff % 3600000) / 60000);
  return id ? `${h}j ${m}m` : `${h}h ${m}m`;
}

function deriveBias(market: Market | null): Bias {
  if (!market?.coins?.length) return "Neutral";
  const btc = market.coins.find((c) => c.symbol === "BTC")?.change ?? 0;
  const eth = market.coins.find((c) => c.symbol === "ETH")?.change ?? 0;
  const sol = market.coins.find((c) => c.symbol === "SOL")?.change ?? 0;
  const breadth = market.total3Change ?? 0;
  const score = btc * 0.45 + eth * 0.2 + sol * 0.15 + breadth * 0.2;
  if (score > 0.7) return "Risk-on";
  if (score < -0.7) return "Risk-off";
  return "Neutral";
}

function structureLabel(market: Market | null, id: boolean) {
  if (!market) return "—";
  const btc = market.coins.find((c) => c.symbol === "BTC")?.change ?? 0;
  const eth = market.coins.find((c) => c.symbol === "ETH")?.change ?? 0;
  const sol = market.coins.find((c) => c.symbol === "SOL")?.change ?? 0;
  const breadth = market.total3Change ?? 0;
  if (btc > 0 && breadth > 0.5 && eth >= btc * 0.65) return tr("BREADTH CONFIRMS", id);
  if (btc > 0 && breadth < -0.5) return tr("BREADTH DIVERGES", id);
  if (btc < 0 && breadth < -0.5 && eth <= 0) return tr("BTC LEADS", id);
  if (Math.abs(sol - btc) > 2) return tr("BREADTH DIVERGES", id);
  return tr("MIXED — NO EDGE YET", id);
}

function riskFromMarket(market: Market | null, next: CalendarEvent | null): { flag: string; level: "LOW" | "MEDIUM" | "HIGH" } {
  const btc = market?.coins.find((c) => c.symbol === "BTC")?.change ?? 0;
  const breadth = market?.total3Change ?? 0;
  const divergence = Math.abs(btc - breadth);
  if (divergence >= 2.5) return { flag: "LIQUIDITY_SWEEP", level: "HIGH" };
  if (next && next.impact === "HIGH" && next.utcMs - Date.now() < 24 * 3600000) return { flag: "EVENT_WHIPSAW", level: "HIGH" };
  if (next?.category === "FED" || /CPI|PCE|PPI|NFP|Employment/i.test(next?.title ?? "")) return { flag: "MACRO_HEADWIND", level: "MEDIUM" };
  if (divergence >= 1.5) return { flag: "BREAKOUT_TRAP", level: "MEDIUM" };
  return { flag: "NONE", level: "LOW" };
}

export default function PredictiveDecision() {
  const { language } = usePreferences();
  const id = language === "id";
  const [event, setEvent] = useState<IntelEvent | null>(null);
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
  const [market, setMarket] = useState<Market | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [intelRes, calendarRes, marketRes] = await Promise.all([
          fetch("/api/intelligence", { cache: "default" }),
          fetch("/api/calendar", { cache: "default" }),
          fetch("/api/market", { cache: "default" }),
        ]);
        if (!intelRes.ok || !calendarRes.ok || !marketRes.ok) return;
        const [intel, calendar, marketData] = await Promise.all([intelRes.json(), calendarRes.json(), marketRes.json()]);
        if (!active) return;
        setEvent(intel.events?.[0] ?? null);
        setNextEvent((calendar.events ?? []).find((e: CalendarEvent) => e.impact === "HIGH" && e.utcMs > Date.now()) ?? null);
        setMarket(marketData);
      } catch {
        // Radar remains silent until the cached inputs are available.
      }
    };
    void load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const currentBias = useMemo(() => deriveBias(market), [market]);
  const structure = useMemo(() => structureLabel(market, id), [market, id]);
  const marketRisk = useMemo(() => riskFromMarket(market, nextEvent), [market, nextEvent]);
  const p = event?.predictive;
  const direction: Bias = event?.direction && event.direction !== "Neutral" ? event.direction : currentBias;
  const directionTone = tone(direction);
  const riskLevel = marketRisk.level === "HIGH" || p?.riskLevel === "HIGH" ? "HIGH" : marketRisk.level === "MEDIUM" || p?.riskLevel === "MEDIUM" ? "MEDIUM" : "LOW";
  const riskFlag = marketRisk.level !== "LOW" ? marketRisk.flag : (p?.riskFlag ?? "NONE");
  const riskTone = riskLevel === "HIGH" ? "var(--red)" : riskLevel === "MEDIUM" ? "var(--yellow)" : "var(--green)";
  const action = direction === "Risk-on"
    ? riskLevel === "HIGH" ? tr("BULLISH, BUT ENTRY NOT YET SAFE", id) : tr("CONFIRMATION REQUIRED", id)
    : direction === "Risk-off"
      ? tr("BEARISH, BUT WAIT FOR REACTION", id)
      : tr("MIXED — NO EDGE YET", id);

  const baseCase = p?.baseCase ?? (direction === "Risk-on"
    ? "BTC holds strength → ETH/SOL follow → TOTAL3 breadth expands."
    : direction === "Risk-off"
      ? "BTC stays weak → ETH/SOL lag → downside spreads into alts."
      : "BTC remains two-way until price and breadth align.");
  const riskCase = p?.riskCase ?? (riskLevel === "HIGH"
    ? "Liquidity is swept first, then price attempts to reclaim the directional move."
    : "First reaction fails to gain follow-through and the move reverses.");
  const worstCase = p?.worstCase ?? (direction === "Risk-on"
    ? "Breakout fails → long liquidation → breadth contracts."
    : direction === "Risk-off"
      ? "Support fails → deleveraging expands → alt weakness accelerates."
      : "Two-way volatility increases without a clean edge.");

  const confirmation = p?.confirmation?.length ? p.confirmation.slice(0, 3) : [
    "BTC holds the catalyst level",
    "ETH / SOL confirm the move",
    "TOTAL3 breadth expands with price",
  ];
  const invalidation = p?.invalidation?.length ? p.invalidation.slice(0, 3) : [
    "BTC loses the key level",
    "ETH / SOL lag after the first reaction",
    "TOTAL3 breadth contracts",
  ];

  if (!nextEvent && !event) return null;

  return (
    <section className="shell section" style={{ paddingTop: 18, paddingBottom: 8 }} aria-label="REVEDGE predictive radar">
      <style>{`
        .re-predictive{border:1px solid var(--line);border-radius:24px;background:var(--panel);overflow:hidden}
        .re-predictive-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:22px 24px 18px;border-bottom:1px solid var(--line)}
        .re-predictive-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:0}
        .re-predictive-main{padding:24px;border-right:1px solid var(--line)}
        .re-predictive-side{padding:24px}
        .re-kicker{font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--muted);text-transform:uppercase}
        .re-direction{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-top:10px}
        .re-direction strong{font-family:Manrope,sans-serif;font-size:42px;line-height:.95;letter-spacing:-.065em}
        .re-score{text-align:right}.re-score b{font-family:Manrope,sans-serif;font-size:25px}.re-score span{display:block;font-size:8px;color:var(--muted);letter-spacing:.08em;margin-top:4px}
        .re-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:20px}
        .re-metric{border:1px solid var(--line);border-radius:14px;padding:12px;background:transparent}.re-metric span{display:block;font-size:8px;color:var(--muted);letter-spacing:.09em;text-transform:uppercase}.re-metric b{display:block;margin-top:7px;font-size:11px;color:var(--text)}
        .re-catalyst{margin-top:12px;border:1px solid var(--line);border-radius:16px;padding:15px;background:color-mix(in srgb,var(--panel) 90%,var(--gold-soft) 10%)}
        .re-catalyst h3{margin:7px 0 5px;font-family:Manrope,sans-serif;font-size:20px;letter-spacing:-.04em}.re-catalyst p{margin:0;color:var(--muted);font-size:10px;line-height:1.5}
        .re-catalyst-time{float:right;text-align:right;font-size:9px;color:var(--gold-soft);font-weight:700}
        .re-risk{border:1px solid var(--line);border-left:3px solid var(--risk);border-radius:15px;padding:14px;background:color-mix(in srgb,var(--panel) 94%,var(--risk) 6%)}
        .re-risk strong{display:block;margin-top:6px;font-family:Manrope,sans-serif;font-size:17px;color:var(--risk)}.re-risk small{display:block;margin-top:5px;color:var(--muted);font-size:9px}
        .re-scenarios{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.re-scenario{border:1px solid var(--line);border-radius:14px;padding:13px}.re-scenario span{font-size:8px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}.re-scenario b{display:block;margin-top:7px;font-size:10px;line-height:1.5;color:var(--text)}.re-scenario.worst{border-color:color-mix(in srgb,var(--red) 45%,var(--line));background:color-mix(in srgb,var(--panel) 94%,var(--red) 6%)}
        .re-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.re-check{border:1px solid var(--line);border-radius:14px;padding:13px}.re-check ul{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:6px}.re-check li{font-size:9px;line-height:1.45;color:var(--muted)}.re-check li::before{content:"•";color:var(--gold-soft);margin-right:7px}
        .re-action{margin-top:12px;border:1px solid var(--line);border-left:3px solid var(--gold-soft);border-radius:15px;padding:14px;background:color-mix(in srgb,var(--panel) 95%,var(--gold-soft) 5%)}.re-action strong{display:block;margin-top:6px;font-family:Manrope,sans-serif;font-size:18px;letter-spacing:-.03em}.re-action p{margin:6px 0 0;color:var(--muted);font-size:9px}
        @media(max-width:800px){.re-predictive-grid{grid-template-columns:1fr}.re-predictive-main{border-right:0;border-bottom:1px solid var(--line)}.re-direction strong{font-size:34px}.re-metrics,.re-scenarios{grid-template-columns:1fr}.re-checks{grid-template-columns:1fr}}
      `}</style>

      <div className="re-predictive">
        <div className="re-predictive-head">
          <div><div className="label">{tr("PREDICTIVE RADAR", id)} · V2</div><div className="muted" style={{ marginTop: 5 }}>{tr("PRE-EVENT RADAR", id)} · {nextEvent ? countdown(nextEvent.utcMs, id) : "—"}</div></div>
          <div style={{ textAlign: "right" }}><div className="label">{tr("MODEL STATE", id)}</div><b style={{ display: "block", marginTop: 6, fontSize: 11 }}>{nextEvent ? tr("PREPARE", id) : tr("WAIT", id)}</b></div>
        </div>

        <div className="re-predictive-grid">
          <div className="re-predictive-main">
            <div className="re-kicker">{tr("CURRENT BIAS", id)}</div>
            <div className="re-direction">
              <strong style={{ color: directionTone.accent }}>{tr(direction === "Risk-on" ? "Bullish" : direction === "Risk-off" ? "Bearish" : "Neutral", id)}</strong>
              <div className="re-score"><b style={{ color: directionTone.accent }}>{p?.directionScore ?? (direction === "Neutral" ? 55 : 72)}/100</b><span>{tr("DIRECTION", id)}</span></div>
            </div>
            <div className="re-metrics">
              <div className="re-metric"><span>{tr("EXECUTION", id)}</span><b>{p?.executionScore ?? (riskLevel === "HIGH" ? 45 : riskLevel === "MEDIUM" ? 62 : 76)}/100</b></div>
              <div className="re-metric"><span>{tr("MARKET STRUCTURE", id)}</span><b>{structure}</b></div>
              <div className="re-metric"><span>{tr("LIQUIDITY RISK", id)}</span><b style={{ color: riskTone }}>{tr(riskLevel, id)}</b></div>
            </div>

            {nextEvent && <div className="re-catalyst"><div className="re-catalyst-time">T−{countdown(nextEvent.utcMs, id)}<br/>{nextEvent.wib}</div><div className="re-kicker">{tr("NEXT CATALYST", id)} · {nextEvent.category}</div><h3>{nextEvent.title}</h3><p>{nextEvent.note}</p></div>}

            <div className="re-action"><div className="re-kicker">{tr("ACTION NOW", id)}</div><strong style={{ color: directionTone.accent }}>{action}</strong><p>{p?.why ?? "Headline is an input. Price + breadth confirmation decides whether the directional bias becomes tradable."}</p></div>
          </div>

          <div className="re-predictive-side">
            <div className="re-risk" style={{ "--risk": riskTone } as React.CSSProperties}>
              <div className="re-kicker">{tr("RISK FLAG", id)}</div>
              <strong>{tr(riskFlag, id)}</strong>
              <small>{riskLevel === "HIGH" ? tr("HIGH", id) : riskLevel === "MEDIUM" ? tr("MEDIUM", id) : tr("LOW", id)} · {p?.riskLabel ?? "Liquidity / event risk is being monitored."}</small>
            </div>

            <div className="re-scenarios">
              <div className="re-scenario"><span>{tr("BASE CASE", id)}</span><b>{baseCase}</b></div>
              <div className="re-scenario"><span>{tr("RISK CASE", id)}</span><b>{riskCase}</b></div>
              <div className="re-scenario worst"><span>{tr("WORST CASE", id)}</span><b>{worstCase}</b></div>
            </div>

            <div className="re-checks">
              <div className="re-check"><div className="re-kicker">{tr("CONFIRMATION", id)}</div><ul>{confirmation.map((item, i) => <li key={`c-${i}`}>{item}</li>)}</ul></div>
              <div className="re-check"><div className="re-kicker">{tr("INVALIDATION", id)}</div><ul>{invalidation.map((item, i) => <li key={`i-${i}`}>{item}</li>)}</ul></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
