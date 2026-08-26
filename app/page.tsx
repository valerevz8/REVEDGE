import MarketNow from "./components/MarketNow";
import TradingViewChart from "./components/TradingViewChart";
import HighImpact from "./components/HighImpact";
import SectorRadar from "./components/SectorRadar";

export default function Home() {
  return (
    <main>
      <header className="shell nav">
        <a className="brand" href="#top"><span className="brand-rev">REV</span><span className="brand-edge">EDGE</span></a>
        <nav className="navlinks"><a href="#impact">High Impact</a><a href="#market">Market</a><a href="#charts">Charts</a><a href="#sectors">Sectors</a><a href="#pro">Pricing</a></nav>
        <div className="navright"><span className="lang">EN / ID</span><a className="sign" href="#pro">Sign in</a><button className="probtn">Go Pro</button></div>
      </header>

      <HighImpact />

      <section className="shell hero" id="top">
        <div><div className="eyebrow">Curated crypto intelligence</div><h1><span className="hero-main">See what matters.</span><span className="hero-sub">Before the noise.</span></h1><p>Market-moving events, live market structure, and capital rotation — filtered down to what a trader actually needs to know.</p><div className="actions"><a className="btn primary" href="#impact">Explore REVEDGE</a><a className="btn" href="#pro">Go Pro</a></div></div><MarketNow />
      </section>

      <TradingViewChart />
      <SectorRadar />

      <section className="shell section" id="pro"><div className="card" style={{textAlign:"center",padding:"34px 20px"}}><div className="label">REVEDGE PRO</div><h2 style={{fontSize:30,marginTop:8}}>The market, personalized.</h2><p className="muted" style={{maxWidth:560,margin:"10px auto 20px"}}>Watchlist intelligence, personalized impact, custom alerts, and deeper sector signals. Free stays public. Pro becomes yours.</p><a className="btn primary" href="#top">Explore Pro</a></div></section>
      <footer className="shell footer"><span>REVEDGE · A REVE ecosystem product</span><span>See what matters. Before the noise.</span></footer>
    </main>
  );
}
