"use client";

import { useEffect, useState } from "react";

type Row = { watch: string; trigger: string; invalidation: string };
type Story = {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  impact: number;
  tag: string;
  direction: "Risk-on" | "Risk-off" | "Neutral";
  urgency: "NOW" | "WATCH";
  window: string;
  confidence: number;
  affected: string[];
  why: string[];
  whatToDo: string;
  avoid: string;
  regime: string;
  bias: string;
  sharpHeadline: string;
  narrative: string;
  tradableSetup: string;
  finalAction: string;
  triggerRows: Row[];
  bullCase: string;
  bearCase: string;
};

type MarketData = {
  coins: { symbol: string; price: number; change: number }[];
  total2: number;
  total2Change: number;
  total3: number;
  total3Change: number;
};

function ageLabel(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta",
  }) + " WIB";
}

export default function HighImpact() {
  const [story, setStory] = useState<Story | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [status, setStatus] = useState("Loading live intelligence…");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [newsRes, marketRes] = await Promise.all([
          fetch("/api/news", { cache: "no-store" }),
          fetch("/api/market", { cache: "no-store" }),
        ]);
        if (!newsRes.ok || !marketRes.ok) throw new Error("unavailable");
        const [news, nextMarket] = await Promise.all([newsRes.json(), marketRes.json()]);
        if (mounted) {
          setStory(news.stories?.[0] ?? null);
          setMarket(nextMarket);
          setStatus(news.stories?.length ? "LIVE · refreshed 60s" : "No high-impact event detected");
        }
      } catch {
        if (mounted) setStatus("Live intelligence unavailable");
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  if (!story) return (
    <section className="shell section" id="impact">
      <div className="sectiontitle"><div><div className="label">Priority feed</div><h2>High Impact</h2></div><span className="sub">{status}</span></div>
      <div className="card newsempty">No sufficiently relevant live event is available right now. REVEDGE will not invent one.</div>
    </section>
  );

  const btc = market?.coins.find((coin) => coin.symbol === "BTC");
  const eth = market?.coins.find((coin) => coin.symbol === "ETH");
  const sol = market?.coins.find((coin) => coin.symbol === "SOL");

  return (
    <section className="shell section" id="impact">
      <div className="sectiontitle">
        <div><div className="label">Priority feed</div><h2>High Impact</h2></div>
        <span className="sub">{status}</span>
      </div>

      <div className="grid">
        <article className="card impact">
          <div className="impacttop">
            <span className={`badge ${story.impact >= 8 ? "badge-hot" : ""}`}>HIGH IMPACT · {story.urgency}</span>
          </div>
          <div className="impactmeter" aria-label={`Impact ${story.impact} out of 10`}>
            {Array.from({ length: 10 }, (_, i) => <span key={i} className={`impactsegment ${i < Math.round(story.impact) ? "active" : ""}`} />)}
          </div>
          <div className="impactscoreline"><strong>{story.impact.toFixed(1)} / 10</strong><span>{story.direction}</span></div>
          <div className="impactscale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
          <h3>{story.title}</h3>
          <p className="muted">{story.why[0]}</p>
          <div className="meta"><span className="chip">{story.tag}</span><span className="chip">{story.affected.join(" · ")}</span><span className="chip">{story.source}</span></div>
          <div className="window">
            <span className="label">Impact window</span>
            <div className="bar"><div className="fill" style={{ width: `${Math.min(100, story.impact * 10)}%` }} /></div>
            <div className="windowline"><span>{ageLabel(story.publishedAt)} old</span><span>{story.window} · {story.urgency}</span></div>
          </div>
        </article>

        <div className="card">
          <div className="label">Why it matters</div>
          <h3>{story.narrative.replace(/\b\w/g, (c) => c.toUpperCase())}.</h3>
          <p className="muted">{story.why[1]}</p>
          <div className="meta">
            <span className="chip">{story.bias}</span>
            <span className="chip">BTC → ETH → SOL</span>
            <span className="chip">{story.tradableSetup}</span>
          </div>
        </div>
      </div>

      <div className="highdetail">
        <article className="card">
          <div className="label">Impact intelligence</div>
          <div className="detailgrid">
            <div className="detail"><span>Event age</span><b>{ageLabel(story.publishedAt)}</b></div>
            <div className="detail"><span>Confidence</span><b>{story.confidence}%</b></div>
            <div className="detail"><span>Market impact</span><b>{story.impact.toFixed(1)} / 10</b></div>
            <div className="detail"><span>Urgency</span><b>{story.urgency}</b></div>
            <div className="detail"><span>Direction</span><b className={story.direction === "Risk-off" ? "direction" : story.direction === "Risk-on" ? "positive" : ""}>{story.direction}</b></div>
            <div className="detail"><span>Window</span><b>{story.window}</b></div>
            <div className="detail"><span>Regime</span><b>{story.regime}</b></div>
            <div className="detail"><span>Primary driver</span><b>{story.affected[0]}</b></div>
            <div className="detail"><span>Second-order</span><b>{story.affected.slice(1).join(" → ") || "Monitor breadth"}</b></div>
            {btc && <div className="detail"><span>BTC</span><b>{btc.change >= 0 ? "+" : ""}{btc.change.toFixed(1)}%</b></div>}
            {eth && <div className="detail"><span>ETH</span><b>{eth.change >= 0 ? "+" : ""}{eth.change.toFixed(1)}%</b></div>}
            {sol && <div className="detail"><span>SOL</span><b>{sol.change >= 0 ? "+" : ""}{sol.change.toFixed(1)}%</b></div>}
            {market && <div className="detail"><span>TOTAL3</span><b>{market.total3Change >= 0 ? "+" : ""}{market.total3Change.toFixed(1)}%</b></div>}
          </div>
          <div className="meta">
            <span className="chip">Source: {story.source}</span>
            <span className="chip">Status: ACTIVE</span>
            <span className="chip">Event: {timeLabel(story.publishedAt)}</span>
          </div>
        </article>

        <article className="card actionbox">
          <div className="label">Trader guidance</div>
          <h3>What to do</h3>
          <div className="actionlist">
            <div className="actionrow"><strong>01</strong><span>{story.whatToDo}</span></div>
            <div className="actionrow"><strong>02</strong><span><strong>Trigger:</strong> {story.triggerRows[0]?.trigger ?? "Wait for price confirmation."}</span></div>
            <div className="actionrow"><strong>03</strong><span><strong>Confirmation:</strong> {story.triggerRows.slice(1, 3).map((r) => r.watch + " → " + r.trigger).join(" · ")}</span></div>
            <div className="actionrow"><strong>04</strong><span><strong>Invalidation:</strong> {story.triggerRows[0]?.invalidation ?? "BTC fails the move and breadth contracts."}</span></div>
            <div className="actionrow"><strong>05</strong><span><strong>Final read:</strong> {story.finalAction}</span></div>
          </div>
          <div className="dont"><strong>DON'T:</strong> {story.avoid}</div>
        </article>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Decision frame</div>
        <div className="actionlist">
          <div className="actionrow"><strong>🟢</strong><span><strong>Bull recovery:</strong> {story.bullCase}</span></div>
          <div className="actionrow"><strong>🔴</strong><span><strong>Macro rejection:</strong> {story.bearCase}</span></div>
        </div>
      </div>
    </section>
  );
}
