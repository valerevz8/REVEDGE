"use client";

import { useEffect, useState } from "react";
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

type Event = {
  title: string;
  direction: "Risk-on" | "Risk-off" | "Neutral";
  bias: string;
  regime: string;
  impact: number;
  lifecycle: string;
  predictive?: Predictive;
};

const ID: Record<string, string> = {
  "PREDICTIVE RADAR": "RADAR PREDIKSI",
  "DIRECTION": "ARAH MARKET",
  "EXECUTION": "KELAYAKAN ENTRY",
  "RISK FLAG": "RISIKO UTAMA",
  "BASE CASE": "SKENARIO UTAMA",
  "RISK CASE": "SKENARIO RISIKO",
  "WORST CASE": "SKENARIO TERBURUK",
  "CONFIRMATION": "KONFIRMASI",
  "INVALIDATION": "INVALIDASI",
  "WAIT — ARAH BULLISH, TAPI ENTRY BELUM AMAN": "TUNGGU — ARAH BULLISH, TAPI ENTRY BELUM AMAN",
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
  "Cautious": "Waspada",
  "Mixed": "Campuran",
};

function tr(value: string, id: boolean) {
  return id ? (ID[value] ?? value) : value;
}

function tone(direction: Event["direction"]) {
  if (direction === "Risk-on") return { accent: "var(--green)", bg: "rgba(117,215,154,.08)" };
  if (direction === "Risk-off") return { accent: "var(--red)", bg: "rgba(231,125,125,.08)" };
  return { accent: "var(--yellow)", bg: "rgba(217,189,115,.08)" };
}

export default function PredictiveDecision() {
  const { language } = usePreferences();
  const id = language === "id";
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/intelligence", { cache: "default" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setEvent(data.events?.[0] ?? null);
      } catch {
        // Keep the radar silent if the cached intelligence snapshot is unavailable.
      }
    };
    void load();
    const timer = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!event?.predictive) return null;

  const p = event.predictive;
  const marketTone = tone(event.direction);
  const riskTone = p.riskLevel === "HIGH" ? "var(--red)" : p.riskLevel === "MEDIUM" ? "var(--yellow)" : "var(--green)";
  const riskBg = p.riskLevel === "HIGH" ? "rgba(231,125,125,.08)" : p.riskLevel === "MEDIUM" ? "rgba(217,189,115,.08)" : "rgba(117,215,154,.06)";

  return (
    <section className="shell section" style={{ paddingTop: 18, paddingBottom: 4 }} aria-label="REVEDGE predictive radar">
      <div className="card" style={{ padding: 18, borderColor: marketTone.accent, background: `linear-gradient(135deg, ${marketTone.bg}, var(--panel))` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <div>
            <div className="label">{tr("PREDICTIVE RADAR", id)} · V1</div>
            <h3 style={{ margin: "7px 0 4px", fontSize: 20 }}>{event.title}</h3>
            <div className="muted">{tr(event.bias, id)} · {tr(event.regime, id)} · {event.impact.toFixed(1)}/10</div>
          </div>
          <div style={{ minWidth: 230, textAlign: "right" }}>
            <div className="label">{tr("RISK FLAG", id)}</div>
            <strong style={{ display: "block", marginTop: 7, color: riskTone, fontFamily: "Manrope, sans-serif", fontSize: 15 }}>{tr(p.riskFlag, id)}</strong>
            <span style={{ display: "inline-block", marginTop: 6, padding: "5px 8px", border: `1px solid ${riskTone}`, borderRadius: 999, color: riskTone, background: riskBg, fontSize: 9, fontWeight: 700, letterSpacing: ".06em" }}>{tr(p.riskLevel, id)}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 14 }}>
          <div className="detail" style={{ background: "transparent" }}><span>{tr("DIRECTION", id)}</span><b style={{ color: marketTone.accent }}>{tr(event.bias, id)} · {p.directionScore}/100</b></div>
          <div className="detail" style={{ background: "transparent" }}><span>{tr("EXECUTION", id)}</span><b>{p.executionScore}/100</b></div>
          <div className="detail" style={{ background: "transparent" }}><span>IMMEDIATE READ</span><b style={{ color: riskTone }}>{tr(p.immediateRead, id)}</b></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
          <div className="detail" style={{ background: "transparent" }}><span>{tr("BASE CASE", id)}</span><b>{p.baseCase}</b></div>
          <div className="detail" style={{ background: "transparent" }}><span>{tr("RISK CASE", id)}</span><b>{p.riskCase}</b></div>
          <div className="detail" style={{ background: riskBg, borderColor: riskTone }}><span>{tr("WORST CASE", id)}</span><b>{p.worstCase}</b></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div className="detail" style={{ background: "transparent" }}><span>{tr("CONFIRMATION", id)}</span><b>{p.confirmation.length ? p.confirmation.join(" · ") : p.why}</b></div>
          <div className="detail" style={{ background: "transparent" }}><span>{tr("INVALIDATION", id)}</span><b>{p.invalidation.length ? p.invalidation.join(" · ") : "—"}</b></div>
        </div>
      </div>
    </section>
  );
}
