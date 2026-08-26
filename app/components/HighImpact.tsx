"use client";

import { useEffect, useState } from "react";

type Story = { title: string; source: string; link: string; publishedAt: string; impact: number; tag: string; direction: "Risk-on" | "Risk-off" | "Neutral"; urgency: "NOW" | "WATCH" | "LOW"; window: string; confidence: number; affected: string[]; why: string; };
function ageLabel(iso: string) { const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); if (mins < 60) return `${mins}m`; const hours = Math.floor(mins / 60); if (hours < 24) return `${hours}h`; return `${Math.floor(hours / 24)}d`; }

export default function HighImpact() {
  const [story, setStory] = useState<Story | null>(null);
  const [status, setStatus] = useState("Loading live intelligence…");
  useEffect(() => { let mounted = true; const load = async () => { try { const res = await fetch("/api/news", { cache: "no-store" }); if (!res.ok) throw new Error("unavailable"); const data = await res.json(); if (mounted) { setStory((data.stories ?? [])[0] ?? null); setStatus(data.stories?.length ? "LIVE · refreshed 60s" : "No high-impact event detected"); } } catch { if (mounted) setStatus("Live intelligence unavailable"); } }; load(); const timer = setInterval(load, 60000); return () => { mounted = false; clearInterval(timer); }; }, []);
  if (!story) return <section className="shell section" id="impact"><div className="sectiontitle"><div><div className="label">Priority feed</div><h2>High Impact</h2></div><span className="sub">{status}</span></div><div className="card newsempty">No sufficiently relevant live event is available right now. REVEDGE will not invent one.</div></section>;
  const filled = Math.max(1, Math.min(10, Math.round(story.impact)));
  return <section className="shell section" id="impact">
    <div className="sectiontitle"><div><div className="label">Priority feed</div><h2>High Impact</h2></div><span className="sub">{status}</span></div>
    <div className="grid">
      <article className="card impact">
        <div className="impacttop"><span className={`badge ${story.impact >= 8 ? "badge-hot" : ""}`}>HIGH IMPACT · {story.urgency}</span></div>
        <div className="impactmeter" aria-label={`Impact ${story.impact} out of 10`}>{Array.from({ length: 10 }, (_, i) => <span key={i} className={`impactsegment ${i < filled ? "active" : ""}`} />)}</div>
        <div className="impactscoreline"><strong>{story.impact.toFixed(1)} / 10</strong><span>{story.direction}</span></div>
        <div className="impactscale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
        <h3>{story.title}</h3><p className="muted">{story.why}</p>
        <div className="meta"><span className="chip">{story.tag}</span><span className="chip">{story.affected.join(" · ")}</span><span className="chip">{story.source}</span></div>
        <div className="window"><span className="label">Impact window</span><div className="bar"><div className="fill" style={{ width: `${Math.min(100, story.impact * 10)}%` }} /></div><div className="windowline"><span>{ageLabel(story.publishedAt)} old</span><span>{story.window} · {story.urgency}</span></div></div>
      </article>
      <div className="card"><div className="label">Why it matters</div><h3>{story.direction} context.</h3><p className="muted">REVEDGE ranks this event from source quality, recency, market relevance and directional language. The score describes importance, not a trade signal.</p><div className="meta"><span className="chip">Confidence {story.confidence}%</span><span className="chip">BTC → ETH → SOL</span><span className="chip">{story.window}</span></div></div>
    </div>
    <div className="highdetail">
      <article className="card"><div className="label">Impact intelligence</div><div className="detailgrid">
        <div className="detail"><span>Event age</span><b>{ageLabel(story.publishedAt)}</b></div><div className="detail"><span>Confidence</span><b>{story.confidence}%</b></div><div className="detail"><span>Market impact</span><b>{story.impact.toFixed(1)} / 10</b></div><div className="detail"><span>Urgency</span><b>{story.urgency}</b></div>
        <div className="detail"><span>Direction</span><b className={story.direction === "Risk-off" ? "direction" : story.direction === "Risk-on" ? "positive" : ""}>{story.direction}</b></div><div className="detail"><span>Window</span><b>{story.window}</b></div><div className="detail"><span>Primary driver</span><b>{story.affected[0]}</b></div><div className="detail"><span>Second-order</span><b>{story.affected.slice(1).join(" → ") || "Monitor breadth"}</b></div>
      </div><div className="meta"><span className="chip">Source: {story.source}</span><span className="chip">Status: LIVE</span><span className="chip">Updated: {ageLabel(story.publishedAt)} ago</span></div></article>
      <article className="card actionbox"><div className="label">Trader guidance</div><h3>What to do</h3><div className="actionlist">
        <div className="actionrow"><strong>01</strong><span>Do not trade the headline alone. Let price confirm the direction.</span></div><div className="actionrow"><strong>02</strong><span>Use <strong>BTC → ETH → SOL</strong> confirmation before increasing alt exposure.</span></div><div className="actionrow"><strong>03</strong><span>For longs: protect invalidation if BTC weakens and breadth contracts.</span></div><div className="actionrow"><strong>04</strong><span>For shorts: do not chase an initial move; wait for failed reclaim or renewed weakness.</span></div><div className="actionrow"><strong>05</strong><span>Re-check sector and Meme Radar before taking high-beta exposure.</span></div>
      </div><div className="dont"><strong>DON'T:</strong> treat a high-impact score as a buy/sell signal. It only means the event deserves attention.</div></article>
    </div>
  </section>;
}
