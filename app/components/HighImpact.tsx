"use client";

import { useEffect, useState } from "react";

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
  why: string;
  whatToDo: string;
  avoid: string;
  whatToWatch: string[];
  invalidation: string;
};

type MarketCoin = { symbol: string; price: number; change: number };
type MarketData = { coins: MarketCoin[]; total2: number; total2Change: number; total3: number; total3Change: number };

function ageLabel(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function price(value: number) {
  if (!value) return "—";
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 5 })}`;
}

function signal(change: number) {
  if (change >= 1) return "green";
  if (change <= -2) return "red";
  if (change <= -0.5) return "orange";
  return "yellow";
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
      <div className="card newsempty">No sufficiently relevant market-moving event is available right now. REVEDGE will not fill the page with noise.</div>
    </section>
  );

  const filled = Math.max(1, Math.min(10, Math.round(story.impact)));
  const btc = market?.coins.find((coin) => coin.symbol === "BTC");
  const eth = market?.coins.find((coin) => coin.symbol === "ETH");
  const sol = market?.coins.find((coin) => coin.symbol === "SOL");

  return (
    <section className="shell section" id="impact">
      <div className="sectiontitle"><div><div className="label">Priority feed</div><h2>High Impact</h2></div><span className="sub">{status}</span></div>

      <div className="grid">
        <article className="card impact">
          <div className="impacttop"><span className={`badge ${story.impact >= 8 ? "badge-hot" : ""}`}>HIGH IMPACT · {story.urgency}</span></div>
          <div className="impactmeter" aria-label={`Impact ${story.impact} out of 10`}>{Array.from({ length: 10 }, (_, i) => <span key={i} className={`impactsegment ${i < filled ? "active" : ""}`} />)}</div>
          <div className="impactscoreline"><strong>{story.impact.toFixed(1)} / 10</strong><span>{story.direction}</span></div>
          <div className="impactscale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
          <h3>{story.title}</h3>
          <p className="muted">{story.why}</p>
          <div className="meta"><span className="chip">{story.tag}</span><span className="chip">{story.affected.join(" · ")}</span><span className="chip">{story.source}</span></div>
          <div className="window"><span className="label">Impact window</span><div className="bar"><div className="fill" style={{ width: `${Math.min(100, story.impact * 10)}%` }} /></div><div className="windowline"><span>{ageLabel(story.publishedAt)} old</span><span>{story.window} · {story.urgency}</span></div></div>
        </article>

        <article className="card">
          <div className="label">Market impact</div>
          <h3>{story.direction} context.</h3>
          <div className="detailgrid">
            {btc && <div className="detail"><span>BTC</span><b>{price(btc.price)} / {btc.change >= 0 ? "+" : ""}{btc.change.toFixed(1)}% <i className={`signal-dot ${signal(btc.change)}`} /></b></div>}
            {eth && <div className="detail"><span>ETH</span><b>{price(eth.price)} / {eth.change >= 0 ? "+" : ""}{eth.change.toFixed(1)}% <i className={`signal-dot ${signal(eth.change)}`} /></b></div>}
            {sol && <div className="detail"><span>SOL</span><b>{price(sol.price)} / {sol.change >= 0 ? "+" : ""}{sol.change.toFixed(1)}% <i className={`signal-dot ${signal(sol.change)}`} /></b></div>}
            {market && <div className="detail"><span>TOTAL2</span><b>{market.total2Change >= 0 ? "+" : ""}{market.total2Change.toFixed(1)}% <i className={`signal-dot ${signal(market.total2Change)}`} /></b></div>}
            {market && <div className="detail"><span>TOTAL3</span><b>{market.total3Change >= 0 ? "+" : ""}{market.total3Change.toFixed(1)}% <i className={`signal-dot ${signal(market.total3Change)}`} /></b></div>}
          </div>
          <div className="meta"><span className="chip">Confidence {story.confidence}%</span><span className="chip">Event age {ageLabel(story.publishedAt)}</span></div>
        </article>
      </div>

      <div className="highdetail">
        <article className="card actionbox">
          <div className="label">Trader guidance</div>
          <h3>What to do</h3>
          <div className="actionlist">
            <div className="actionrow"><strong>01</strong><span>{story.whatToDo}</span></div>
            <div className="actionrow"><strong>02</strong><span>Wait for price confirmation. A high-impact event is context, not an automatic entry.</span></div>
            <div className="actionrow"><strong>03</strong><span>Use BTC → ETH → SOL → TOTAL3 confirmation before increasing high-beta exposure.</span></div>
            <div className="actionrow"><strong>04</strong><span><strong>Watch:</strong> {story.whatToWatch.join(" · ")}</span></div>
          </div>
          <div className="dont"><strong>AVOID:</strong> {story.avoid}</div>
        </article>

        <article className="card">
          <div className="label">Decision frame</div>
          <h3>What changes the read?</h3>
          <div className="actionlist">
            <div className="actionrow"><strong>🟢</strong><span><strong>Recovery:</strong> {story.whatToWatch[0] ?? "Breadth improves"} + leverage pressure fades → look for confirmation.</span></div>
            <div className="actionrow"><strong>🔴</strong><span><strong>Continuation:</strong> {story.invalidation} → reduce risk / no new high-beta exposure.</span></div>
          </div>
          <div className="meta"><span className="chip">Source: {story.source}</span><a className="chip" href={story.link} target="_blank" rel="noreferrer">Read source ↗</a></div>
        </article>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">One-line read</div>
        <p className="muted" style={{ margin: "10px 0 0", fontSize: 18, lineHeight: 1.6 }}>{story.why} Until the market confirms, protect capital and wait.</p>
      </div>
    </section>
  );
}
