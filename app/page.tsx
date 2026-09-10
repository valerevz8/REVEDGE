import MarketNow from "./components/MarketNow";
import TradingViewChart from "./components/TradingViewChart";
import RealtimeHighImpact from "./components/RealtimeHighImpact";
import SectorRadar from "./components/SectorRadar";
import { HeaderPreferences } from "./components/Preferences";

export default function Home() {
  return (
    <main>
      <style>{`
        /* High Impact layout: preserve the main premium design; only reorder the requested blocks. */
        #impact{display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:14px}
        #impact>.sectiontitle{order:3;width:100%}
        #impact>.card:nth-child(3){order:2;width:calc(50% - 7px);margin-top:0!important}
        #impact>.grid{order:4;width:100%}
        #impact>.highdetail{order:5;width:100%}
        #impact>.card:nth-child(5){order:6;width:calc(50% - 7px)}
        #impact>.card:nth-child(6){order:7;width:calc(50% - 7px)}
        #impact>.card:nth-child(7){order:2;width:calc(50% - 7px)}
        @media(max-width:800px){
          #impact{display:block}
          #impact>.sectiontitle,#impact>.card,#impact>.grid,#impact>.highdetail{width:auto}
        }
      `}</style>
      <header className="shell nav">
        <a className="brand" href="#top"><span className="brand-rev">REV</span><span className="brand-edge">EDGE</span></a>
        <nav className="navlinks"><a href="#impact">High Impact</a><a href="/calendar">Event Calendar</a><a href="#market">Market</a><a href="#charts">Charts</a><a href="#sectors">Sectors</a><a href="#pro">Pricing</a></nav>
        <div className="navright"><HeaderPreferences /><a className="sign" href="#pro">Sign in</a><button className="probtn">Go Pro</button></div>
      </header>

      <RealtimeHighImpact />

      <section className="shell hero" id="top">
        <div><div className="eyebrow">Curated crypto intelligence</div><h1><span className="hero-main">See what matters.</span><span className="hero-sub">Before the noise.</span></h1><p>Market-moving events, live market structure, and capital rotation — filtered down to what a trader actually needs to know.</p><div className="actions"><a className="btn primary" href="#impact">Explore REVEDGE</a><a className="btn" href="/calendar">View Event Calendar</a></div></div><MarketNow /></section>

      <TradingViewChart />
      <SectorRadar />

      <section className="shell section" id="pro"><div className="card" style={{textAlign:"center",padding:"34px 20px"}}><div className="label">REVEDGE PRO</div><h2 style={{fontSize:30,marginTop:8}}>The market, personalized.</h2><p className="muted" style={{maxWidth:560,margin:"10px auto 20px"}}>Watchlist intelligence, personalized impact, custom alerts, and deeper sector signals. Free stays public. Pro becomes yours.</p><a className="btn primary" href="#top">Explore Pro</a></div></section>
      <footer className="shell footer"><span>REVEDGE · A REVE ecosystem product</span><span>See what matters. Before the noise.</span></footer>
    </main>
  );
}
