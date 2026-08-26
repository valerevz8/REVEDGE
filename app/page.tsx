import TradingViewChart from "./components/TradingViewChart";

const sectors = [
  ["🥇", "Memecoins", "Rotation developing", "+12.4%"],
  ["🥈", "AI / Compute", "Breadth expanding", "+8.7%"],
  ["🥉", "DeFi", "Volume improving", "+6.9%"],
];

const news = [
  { time: "10:42", tag: "MACRO · P9 · 6–24H", title: "Fed signal shifts rate expectations", text: "A potential liquidity catalyst for BTC and broader risk assets." },
  { time: "09:18", tag: "SOL · P8 · 3–12H", title: "Solana ecosystem activity accelerates", text: "SOL strength is beginning to broaden into higher-beta ecosystem names." },
  { time: "08:52", tag: "BTC · P7 · 24–72H", title: "Bitcoin demand remains resilient", text: "BTC continues to anchor the wider market while alt breadth develops." },
  { time: "08:21", tag: "MEME · P7 · 3–12H", title: "Meme liquidity expands", text: "Several liquid meme names are moving together rather than in isolation." },
];

export default function Home() {
  return (
    <main>
      <header className="shell nav">
        <a className="brand" href="#top">REVEDGE</a>
        <nav className="navlinks">
          <a href="#market">Market</a><a href="#impact">High Impact</a><a href="#charts">Charts</a><a href="#sectors">Sectors</a><a href="#news">News</a><a href="#pro">Pricing</a>
        </nav>
        <div className="navright"><span className="lang">EN / ID</span><a className="sign" href="#pro">Sign in</a><button className="probtn">Go Pro</button></div>
      </header>

      <section className="shell hero" id="top">
        <div>
          <div className="eyebrow">Curated crypto intelligence</div>
          <h1>See what matters.<br/>Before the noise.</h1>
          <p>Market-moving crypto news, high-impact events, and sector rotation — filtered down to what a trader actually needs to know.</p>
          <div className="actions"><a className="btn primary" href="#market">Explore REVEDGE</a><a className="btn" href="#pro">Go Pro</a></div>
        </div>
        <div className="market" id="market">
          <div className="markethead"><span className="label">Market now</span><span className="regime">● RISK-ON</span></div>
          <div className="coins">
            <div className="coin"><b>BTC</b><strong>$80,420</strong><div className="up">+4.8%</div></div>
            <div className="coin"><b>ETH</b><strong>$3,820</strong><div className="up">+5.2%</div></div>
            <div className="coin"><b>SOL</b><strong>$188.40</strong><div className="up">+6.1%</div></div>
          </div>
        </div>
      </section>

      <section className="shell section" id="impact">
        <div className="sectiontitle"><div><div className="label">Priority feed</div><h2>High Impact</h2></div><span className="sub">Only what can move the market.</span></div>
        <div className="grid">
          <article className="card impact">
            <div className="impacttop"><span className="badge">HIGH IMPACT · ACTIVE</span><span className="score">P9</span></div>
            <h3>Fed signal shifts rate expectations</h3>
            <p className="muted">Markets are repricing the path for rates. The key question for crypto is whether liquidity expectations strengthen or tighten from here.</p>
            <div className="meta"><span className="chip">MACRO</span><span className="chip">BTC · ETH · SOL</span><span className="chip">Risk catalyst</span></div>
            <div className="window"><span className="label">Impact window</span><div className="bar"><div className="fill" /></div><div className="windowline"><span>████████░░</span><span>6–24H · ACTIVE</span></div></div>
          </article>
          <div className="card"><div className="label">Why it matters</div><h3>Liquidity first.</h3><p className="muted">BTC sets the weather. ETH and SOL confirm whether the move is broadening. High-beta sectors react next.</p><div className="meta"><span className="chip">BTC → ETH → SOL</span><span className="chip">Watch breadth</span></div></div>
        </div>

        <div className="highdetail">
          <article className="card">
            <div className="label">Impact intelligence</div>
            <div className="detailgrid">
              <div className="detail"><span>Event age</span><b>2H 14M</b></div>
              <div className="detail"><span>Confidence</span><b>92%</b></div>
              <div className="detail"><span>Market impact</span><b>9 / 10</b></div>
              <div className="detail"><span>Urgency</span><b>NOW</b></div>
              <div className="detail"><span>Direction</span><b className="direction">Risk-off risk</b></div>
              <div className="detail"><span>Window</span><b>6–24H</b></div>
              <div className="detail"><span>Primary driver</span><b>BTC / Liquidity</b></div>
              <div className="detail"><span>Second-order</span><b>ETH → SOL → Alts</b></div>
            </div>
            <div className="meta"><span className="chip">Source: Macro / official release</span><span className="chip">Status: ACTIVE</span><span className="chip">Last reviewed: 10:42</span></div>
          </article>

          <article className="card actionbox">
            <div className="label">Trader guidance</div>
            <h3>What to do</h3>
            <div className="actionlist">
              <div className="actionrow"><strong>01</strong><span>Wait for the first volatility spike to settle. Do not chase the headline candle.</span></div>
              <div className="actionrow"><strong>02</strong><span>Use <strong>BTC → ETH → SOL</strong> confirmation before increasing alt exposure.</span></div>
              <div className="actionrow"><strong>03</strong><span>For longs: tighten invalidation or reduce size if breadth contracts while BTC weakens.</span></div>
              <div className="actionrow"><strong>04</strong><span>For shorts: avoid fighting a confirmed BTC/ETH/SOL reversal; wait for failed reclaim or renewed weakness.</span></div>
              <div className="actionrow"><strong>05</strong><span>Re-check Meme Radar only after the broader market direction is confirmed.</span></div>
            </div>
            <div className="dont"><strong>DON'T:</strong> trade simply because the news is P9. P9 means the event matters — not that a trade is automatically valid.</div>
          </article>
        </div>
      </section>

      <TradingViewChart />

      <section className="shell section" id="sectors">
        <div className="sectiontitle"><div><div className="label">Capital rotation</div><h2>Top 3 Sectors</h2></div><span className="sub">Breadth + volume + relative strength</span></div>
        <div className="sectors card">{sectors.map(([rank,name,desc,gain]) => <div className="sector" key={name}><span className="rank">{rank}</span><div><b>{name}</b><small>{desc}</small></div><span className="gain">{gain}</span></div>)}</div>
      </section>

      <section className="shell section">
        <div className="sectiontitle"><div><div className="label">High-beta radar</div><h2>🪙 Meme Radar</h2></div><span className="sub">Rotation developing</span></div>
        <div className="card"><div className="meta" style={{marginTop:0}}><span className="chip">SOLANA MEMES</span><span className="chip">Breadth: Strong</span><span className="chip">Volume: Expanding</span><span className="chip">Liquidity: Healthy</span></div><div className="sectors" style={{marginTop:14}}><div className="sector"><b>BONK</b><span className="muted">Volume 3.8×</span><span className="gain">+18.2%</span></div><div className="sector"><b>PEPE</b><span className="muted">Volume 3.1×</span><span className="gain">+15.7%</span></div><div className="sector"><b>WIF</b><span className="muted">Volume 2.7×</span><span className="gain">+12.4%</span></div></div></div>
      </section>

      <section className="shell section" id="news">
        <div className="sectiontitle"><div><div className="label">Filtered feed</div><h2>Curated News</h2></div><span className="sub">No noise. Just relevance.</span></div>
        <div className="card news">{news.map(item => <article className="newsitem" key={item.time + item.title}><span className="time">{item.time}</span><h4>{item.title}</h4><p>{item.text}</p><div className="meta"><span className="chip">{item.tag}</span></div></article>)}</div>
      </section>

      <section className="shell section" id="pro">
        <div className="card" style={{textAlign:"center",padding:"34px 20px"}}><div className="label">REVEDGE PRO</div><h2 style={{fontSize:30,marginTop:8}}>The market, personalized.</h2><p className="muted" style={{maxWidth:560,margin:"10px auto 20px"}}>Watchlist intelligence, personalized impact, custom alerts, and deeper sector signals. Free stays public. Pro becomes yours.</p><a className="btn primary" href="#top">Explore Pro</a></div>
      </section>

      <footer className="shell footer"><span>REVEDGE · A REVE ecosystem product</span><span>See what matters. Before the noise.</span></footer>
    </main>
  );
}
