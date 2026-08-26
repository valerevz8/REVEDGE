"use client";

import { useEffect, useState } from "react";

type Row = { watch: string; trigger: string; invalidation: string };
type Story = {
  title: string; source: string; link: string; publishedAt: string; impact: number; tag: string;
  direction: "Risk-on" | "Risk-off" | "Neutral"; urgency: "NOW" | "WATCH"; window: string;
  confidence: number; affected: string[]; why: string[]; whatToDo: string; avoid: string;
  regime: string; bias: string; sharpHeadline: string; narrative: string; tradableSetup: string;
  finalAction: string; triggerRows: Row[]; bullCase: string; bearCase: string;
};

type MarketData = {
  coins: { symbol: string; price: number; change: number }[];
  total2: number; total2Change: number; total3: number; total3Change: number;
};

function ageLabel(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function zoneTime(iso: string, timeZone: string, zone: string) {
  return `${new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone })} ${zone}`;
}

function sessionFor(iso: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", hour12: false }).format(new Date(iso)));
  if (hour >= 0 && hour < 7) return "Asia session";
  if (hour >= 7 && hour < 12) return "London session";
  if (hour >= 12 && hour < 21) return "U.S. session";
  return "Asia / off-hours";
}

function positionActions(story: Story) {
  if (story.direction === "Risk-off") return {
    flat: "Stay flat until BTC stabilizes and breadth confirms.",
    long: "Protect the long: tighten SL / reduce size if BTC loses support or breadth contracts.",
    short: "Keep the short only while BTC stays below the key level and SOL/ALT weakness persists; avoid chasing a flush.",
  };
  if (story.direction === "Risk-on") return {
    flat: "Prepare, but wait for BTC → ETH → SOL confirmation before entering.",
    long: "Hold if BTC keeps the reclaim and breadth expands; trail risk under the invalidation level.",
    short: "Reduce the short if BTC reclaims and ETH/SOL confirm; a squeeze can accelerate.",
  };
  return {
    flat: "Wait for price confirmation; the headline alone is not a setup.",
    long: "Keep risk controlled and move SL only after price confirms continuation.",
    short: "Do not add size until the downside is confirmed by BTC and breadth.",
  };
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
  const actions = positionActions(story);
  const headline = story.sharpHeadline || story.title;

  return (
    <section className="shell section" id="impact">
      <div className="sectiontitle"><div><div className="label">Decision intelligence · Priority feed</div><h2>High Impact</h2></div><span className="sub">{status}</span></div>

      <div className="grid">
        <article className="card impact">
          <div className="impacttop"><span className={`badge ${story.impact >= 8 ? "badge-hot" : ""}`}>HIGH IMPACT · {story.urgency}</span></div>
          <h3 style={{fontSize:27,lineHeight:1.08,margin:"18px 0 12px"}}>{headline}</h3>
          <div className="impactmeter" aria-label={`Impact ${story.impact} out of 10`}>{Array.from({ length: 10 }, (_, i) => <span key={i} className={`impactsegment ${i < Math.round(story.impact) ? "active" : ""}`} />)}</div>
          <div className="impactscoreline"><strong>{story.impact.toFixed(1)} / 10</strong><span>{story.direction}</span></div>
          <div className="impactscale"><span>1</span><span>3</span><span>5</span><span>7</span><span>10</span></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,margin:"18px 0 3px",padding:"14px 0",borderTop:"1px solid var(--line)",borderBottom:"1px solid var(--line)"}}>
            <div><span className="label">Priority</span><b>🔥 {story.impact.toFixed(0)}/10</b></div>
            <div><span className="label">Urgency</span><b>{story.urgency === "NOW" ? "WATCH CLOSELY" : "MONITOR"}</b></div>
            <div><span className="label">Regime</span><b>{story.regime}</b></div>
            <div><span className="label">Bias</span><b>{story.bias}</b></div>
          </div>
          <p className="muted">{story.why[0]}</p>
          <div className="meta"><span className="chip">{story.tag}</span><span className="chip">{story.affected.join(" · ")}</span><span className="chip">{story.source}</span></div>
          <div className="window"><span className="label">Impact window</span><div className="bar"><div className="fill" style={{width:`${Math.min(100,story.impact*10)}%`}} /></div><div className="windowline"><span>{ageLabel(story.publishedAt)} old</span><span>{story.window} · {story.urgency}</span></div></div>
        </article>

        <div className="card">
          <div className="label">Why it matters</div>
          <h3>{story.narrative.replace(/\b\w/g, (c) => c.toUpperCase())}.</h3>
          <p className="muted">{story.why[1]}</p>
          <div className="meta"><span className="chip">{story.bias}</span><span className="chip">BTC → ETH → SOL</span><span className="chip">{story.tradableSetup}</span></div>
          <div style={{marginTop:18,padding:13,border:"1px solid var(--line)",background:"#0d0d0c",borderRadius:10}}><span className="label">Immediate read</span><b style={{display:"block",marginTop:7,fontFamily:"Manrope,sans-serif",fontSize:15}}>{story.finalAction}</b></div>
        </div>
      </div>

      <div className="card" style={{marginTop:14}}>
        <div className="label">Event clock</div>
        <div className="detailgrid">
          <div className="detail"><span>Event / alert time</span><b>{zoneTime(story.publishedAt,"Asia/Jakarta","WIB")}</b></div>
          <div className="detail"><span>U.S. time</span><b>{zoneTime(story.publishedAt,"America/New_York","ET")}</b></div>
          <div className="detail"><span>UK time</span><b>{zoneTime(story.publishedAt,"Europe/London","UK")}</b></div>
          <div className="detail"><span>Market session</span><b>{sessionFor(story.publishedAt)}</b></div>
          <div className="detail"><span>Alert age</span><b>{ageLabel(story.publishedAt)}</b></div>
          <div className="detail"><span>Expected relevance</span><b>{story.window}</b></div>
        </div>
        <p className="muted" style={{fontSize:10,marginBottom:0}}>Scheduled events will use the same clock with a future timestamp + countdown once the event calendar layer is connected. This live feed anchors the clock to the verified alert timestamp.</p>
      </div>

      <div className="highdetail">
        <article className="card">
          <div className="label">Impact intelligence</div>
          <div className="detailgrid">
            <div className="detail"><span>Event age</span><b>{ageLabel(story.publishedAt)}</b></div><div className="detail"><span>Confidence</span><b>{story.confidence}%</b></div>
            <div className="detail"><span>Market impact</span><b>{story.impact.toFixed(1)} / 10</b></div><div className="detail"><span>Direction</span><b className={story.direction === "Risk-off" ? "direction" : story.direction === "Risk-on" ? "positive" : ""}>{story.direction}</b></div>
            <div className="detail"><span>Regime</span><b>{story.regime}</b></div><div className="detail"><span>Primary driver</span><b>{story.affected[0]}</b></div>
            <div className="detail"><span>Second-order</span><b>{story.affected.slice(1).join(" → ")}</b></div>
            {btc && <div className="detail"><span>BTC</span><b>{btc.change >= 0 ? "+" : ""}{btc.change.toFixed(1)}%</b></div>}{eth && <div className="detail"><span>ETH</span><b>{eth.change >= 0 ? "+" : ""}{eth.change.toFixed(1)}%</b></div>}{sol && <div className="detail"><span>SOL</span><b>{sol.change >= 0 ? "+" : ""}{sol.change.toFixed(1)}%</b></div>}{market && <div className="detail"><span>TOTAL3</span><b>{market.total3Change >= 0 ? "+" : ""}{market.total3Change.toFixed(1)}%</b></div>}
          </div>
        </article>

        <article className="card actionbox">
          <div className="label">Trader guidance</div><h3>What to do</h3>
          <div className="actionlist"><div className="actionrow"><strong>01</strong><span>{story.whatToDo}</span></div><div className="actionrow"><strong>02</strong><span><b>Trigger:</b> {story.triggerRows[0]?.trigger ?? "Wait for price confirmation."}</span></div><div className="actionrow"><strong>03</strong><span><b>Confirmation:</b> {story.triggerRows.slice(1,3).map((r)=>r.watch+" → "+r.trigger).join(" · ")}</span></div><div className="actionrow"><strong>04</strong><span><b>Invalidation:</b> {story.triggerRows[0]?.invalidation ?? "BTC fails the move and breadth contracts."}</span></div></div>
          <div className="dont"><b>DON'T:</b> {story.avoid}</div>
        </article>
      </div>

      <div className="card" style={{marginTop:14}}>
        <div className="label">What to watch · next few hours</div>
        <div className="actionlist">{story.triggerRows.map((row,i)=><div className="actionrow" key={`${row.watch}-${i}`}><strong>{row.watch}</strong><span><b>Trigger:</b> {row.trigger}<br/><b>Invalidation:</b> {row.invalidation}</span></div>)}</div>
      </div>

      <div className="card" style={{marginTop:14}}>
        <div className="label">Position-aware decision</div>
        <div className="detailgrid">
          <div className="detail"><span>No position</span><b>{actions.flat}</b></div><div className="detail"><span>Open long</span><b>{actions.long}</b></div><div className="detail"><span>Open short</span><b>{actions.short}</b></div>
        </div>
      </div>

      <div className="card actionbox" style={{marginTop:14}}>
        <div className="label">Final action</div><h3>{story.finalAction}</h3><p className="muted">{story.tradableSetup}</p>
        <div className="actionlist"><div className="actionrow"><strong>🟢</strong><span><b>Bull recovery:</b> {story.bullCase}</span></div><div className="actionrow"><strong>🔴</strong><span><b>Rejection:</b> {story.bearCase}</span></div></div>
      </div>
    </section>
  );
}
