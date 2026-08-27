"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "./Preferences";

type Related = { title: string; source: string; publishedAt: string; link: string };
type Event = {
  eventId: string; title: string; sharpHeadline?: string; source: string; publishedAt: string;
  impact: number; priority: number; lifecycle: string; stateChange: string;
  corroboration: number; sourceCount: number; sources: string[]; confirmation: number;
  ageHours: number; window: string; direction: string; regime: string; bias: string;
  tag: string; affected: string[]; why: string[]; narrative: string; finalAction: string;
  tradableSetup: string; triggerRows: { watch: string; trigger: string; invalidation: string }[];
  related: Related[];
};
type Snapshot = { events?: Event[]; generatedAt?: string; engine?: string };

const ID: Record<string, string> = {
  "Decision intelligence · Priority feed": "Intelijen keputusan · Feed prioritas", "High Impact": "Dampak Tinggi",
  "Lifecycle": "Siklus event", "Corroboration": "Konfirmasi sumber", "independent sources": "sumber independen",
  "Impact window": "Jendela dampak", "State change": "Perubahan status", "Related coverage": "Liputan terkait",
  "Why it matters": "Kenapa ini penting", "What to watch": "Yang perlu dipantau", "NEW": "BARU", "ACTIVE": "AKTIF",
  "ESCALATED": "NAIK", "CONFIRMED": "TERKONFIRMASI", "UNCHANGED": "TETAP", "FADING": "MEREDA", "DOWNGRADED": "TURUN",
  "NOW": "SEKARANG", "WATCH": "PANTAU", "old": "lalu", "Sources": "Sumber", "Priority": "Prioritas",
  "Confirmation": "Konfirmasi", "Direction": "Arah", "Market condition": "Kondisi market",
  "No high-impact event is available right now.": "Belum ada event berdampak tinggi yang cukup kuat saat ini.",
  "Trade the confirmation, not the headline.": "Trade setelah konfirmasi, bukan karena headline-nya.",
};
function tr(value: string, id: boolean) { return id ? (ID[value] ?? value) : value; }
function ageLabel(hours: number, id: boolean) { if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`; if (hours < 24) return `${Math.round(hours)}${id ? "j" : "h"}`; return `${Math.round(hours / 24)}${id ? "h" : "d"}`; }
function lifecycleParts(value: string) { const [state, phase] = value.split(" · "); return { state, phase }; }
function windowFor(event: Event) { if (event.lifecycle.includes("NEW · NOW") || event.lifecycle.includes("ACTIVE · NOW")) return "6–24H"; if (event.lifecycle.includes("FADING · WATCH")) return "1–3H"; if (event.lifecycle === "FADING") return "<1H"; return "3–12H"; }
function remainingLabel(event: Event, id: boolean) { if (event.lifecycle === "FADING" || event.ageHours >= 24) return id ? "hampir selesai" : "nearly expired"; if (event.lifecycle.includes("FADING")) return id ? "1–3j" : "1–3h"; if (event.lifecycle.includes("NOW")) return id ? "6–24j" : "6–24h"; return id ? "3–12j" : "3–12h"; }

export default function HighImpactV1() {
  const { language } = usePreferences(); const id = language === "id";
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => { let active = true; const load = async () => { try { const r = await fetch("/api/intelligence", { cache: "no-store" }); if (!r.ok) return; const data = await r.json(); if (active) setSnapshot(data); } catch {} }; void load(); return () => { active = false; }; }, []);
  const event = snapshot?.events?.[0]; const lifecycle = event ? lifecycleParts(event.lifecycle) : null;
  const windowLabel = event ? windowFor(event) : ""; const progress = event ? Math.max(8, Math.min(100, event.impact * 10)) : 0;
  const sources = useMemo(() => event?.sources ?? [], [event]);
  return <section className="shell section" id="impact">
    <div className="sectiontitle"><div><div className="label">{tr("Decision intelligence · Priority feed", id)}</div><h2>{tr("High Impact", id)}</h2></div><span className="sub">{id ? "LANGSUNG · diperbarui tiap 60 detik" : "LIVE · refreshed 60s"}</span></div>
    {!event ? <div className="card newsempty">{tr("No high-impact event is available right now.", id)}</div> : <>
      <div className="grid">
        <article className="card impact" style={{ position: "relative", overflow: "hidden" }}>
          <div className="impacttop"><span className="badge badge-hot">{id ? "DAMPAK TINGGI" : "HIGH IMPACT"} · {id ? tr(lifecycle!.state, true) : lifecycle!.state}</span></div>
          <h3 style={{ fontSize: 27, lineHeight: 1.08, margin: "18px 0 12px" }}>{event.sharpHeadline || event.title}</h3>
          <div className="impactmeter">{Array.from({ length: 10 }, (_, i) => <span key={i} className={`impactsegment ${i < Math.round(event.impact) ? "active" : ""}`} />)}</div>
          <div className="impactscoreline"><strong>{event.impact.toFixed(1)} / 10</strong><span>{event.direction}</span></div>
          <div className="impactscale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
          <div className="decisionstrip">
            <span><b>{tr("Priority", id)}</b> 🔥 {Math.min(10, Math.round(event.priority))}/10</span>
            <span><b>{tr("Lifecycle", id)}</b> {id ? `${tr(lifecycle!.state, true)} · ${tr(lifecycle!.phase, true)}` : event.lifecycle}</span>
            <span><b>{tr("Sources", id)}</b> {event.sourceCount}</span><span><b>{tr("Confirmation", id)}</b> {event.confirmation}%</span>
          </div>
          <p className="muted">{event.why?.[0] || (id ? "Event ini sedang dipantau berdasarkan dampak dan konfirmasi sumber." : "Event is being monitored based on impact and source confirmation.")}</p>
          <div className="meta"><span className="chip">{event.tag}</span><span className="chip">{event.affected.join(" · ")}</span><span className="chip">{event.source}</span></div>
          <div className="window"><span className="label">{tr("Impact window", id)}</span><div className="bar"><div className="fill" style={{ width: `${progress}%` }} /></div><div className="windowline"><span>{ageLabel(event.ageHours, id)} {tr("old", id)}</span><span>{windowLabel} · {id ? tr(lifecycle!.state, true) : lifecycle!.state}</span></div></div>
          <div style={{ marginTop: 14, padding: "12px 0 0", borderTop: "1px solid var(--line)" }}><div className="label">{tr("State change", id)}</div><strong style={{ fontSize: 15 }}>{id ? tr(event.stateChange, true) : event.stateChange}</strong><span className="muted" style={{ marginLeft: 8 }}>· {remainingLabel(event, id)}</span></div>
        </article>
        <aside className="card"><div className="label">{tr("Corroboration", id)}</div><h3>{event.corroboration} {tr("independent sources", id)}</h3><div className="bar" style={{ marginTop: 14 }}><div className="fill" style={{ width: `${event.confirmation}%` }} /></div><div className="windowline"><span>{event.confirmation}% {tr("Confirmation", id)}</span><span>{event.sourceCount} {tr("Sources", id)}</span></div><div className="decisioncall" style={{ marginTop: 18 }}><span className="label">{tr("Direction", id)}</span><b>{event.direction}</b></div><div className="decisioncall"><span className="label">{tr("Market condition", id)}</span><b>{event.regime}</b></div><div className="decisioncall"><span className="label">Bias</span><b>{event.bias}</b></div></aside>
      </div>
      <div className="card" style={{ marginTop: 14 }}><div className="label">{tr("Why it matters", id)}</div><h3>{event.narrative || event.title}</h3><p className="muted">{event.why?.[1] || event.tradableSetup}</p></div>
      <div className="card" style={{ marginTop: 14 }}><div className="label">{tr("What to watch", id)}</div><div className="actionlist">{event.triggerRows.slice(0, 4).map((row, i) => <div className="actionrow" key={`${row.watch}-${i}`}><strong>{String(i + 1).padStart(2, "0")}</strong><span><b>{row.watch}</b><br />{row.trigger}<br /><span className="muted">{row.invalidation}</span></span></div>)}</div></div>
      <div className="card" style={{ marginTop: 14 }}><div className="label">{tr("Related coverage", id)}</div><div className="actionlist">{event.related.slice(0, 5).map((item, i) => <div className="actionrow" key={`${item.source}-${i}`}><strong>{item.source}</strong><span>{item.title}</span></div>)}</div><div className="meta" style={{ marginTop: 12 }}>{sources.map(source => <span className="chip" key={source}>{source}</span>)}</div></div>
      <div className="card actionbox" style={{ marginTop: 14 }}><div className="label">REVEDGE V1</div><h3>{event.finalAction || tr("Trade the confirmation, not the headline.", id)}</h3><p className="muted">{event.tradableSetup}</p></div>
    </>}
  </section>;
}
