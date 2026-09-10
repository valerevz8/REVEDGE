import MarketNow from "./components/MarketNow";
import RealtimeHighImpact from "./components/RealtimeHighImpact";
import SectorRadar from "./components/SectorRadar";
import { HeaderPreferences } from "./components/Preferences";

export default function Home() {
  return (
    <main>
      <style>{`
        /* Only the requested High Impact refinements. */
        #impact{display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:14px}
        #impact>.sectiontitle{order:3;width:100%;margin-top:22px}
        #impact>.card:nth-child(3){order:2;width:calc(50% - 7px);margin-top:0!important}
        #impact>.grid{order:4;width:100%}
        #impact>.highdetail{order:5;width:100%}
        #impact>.card:nth-child(5){order:6;width:calc(50% - 7px)}
        #impact>.card:nth-child(6){order:7;width:calc(50% - 7px)}
        #impact>.card:nth-child(7){order:2;width:calc(50% - 7px)}
        .guidance-grid{margin-top:14px;border-top:1px solid var(--line)}
        .guidance-row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:28px;align-items:center;min-height:46px;padding:11px 0;border-bottom:1px solid var(--line)}
        .guidance-row>span{font-size:9px;color:#77746d;text-transform:uppercase;letter-spacing:.11em}
        .guidance-row>b{font-size:12px;line-height:1.45;color:var(--text)}
        [data-theme="dark"] .re-predictive,[data-theme="dark"] #impact{--line:#403323}
        [data-theme="dark"] .re-predictive .re-predictive-main,[data-theme="dark"] .re-predictive .re-predictive-side{border-color:var(--line)}
        @media(max-width:800px){
          #impact{display:block}
          #impact>.sectiontitle,#impact>.card,#impact>.grid,#impact>.highdetail{width:auto}
          #impact>.sectiontitle{margin-top:22px}
          .guidance-row{grid-template-columns:110px minmax(0,1fr);gap:18px}
        }
      `}</style>
      <header className="shell nav">
        <a className="brand" href="#top"><span className="brand-rev">REVE</span><span className="brand-edge">SENSE</span></a>
        <nav className="navlinks"><a href="#impact">High Impact</a><a href="/calendar">Event Calendar</a><a href="#market">Market</a><a href="#sectors">Sectors</a><a href="#pro">Pricing</a></nav>
        <div className="navright"><HeaderPreferences /><a className="sign" href="#pro">Sign in</a><button className="probtn">Go Pro</button></div>
      </header>

      <RealtimeHighImpact />

      <section className="shell hero" id="top">
        <div><div className="eyebrow">Curated crypto intelligence</div><h1><span className="hero-main">See what matters.</span><span className="hero-sub">Before the noise.</span></h1><p>Market-moving events, live market structure, and capital rotation — filtered down to what a trader actually needs to know.</p><div className="actions"><a className="btn primary" href="#impact">Explore REVESENSE</a><a className="btn" href="/calendar">View Event Calendar</a></div></div><MarketNow /></section>

      <SectorRadar />

      <section className="shell section" id="pro"><div className="card" style={{textAlign:"center",padding:"34px 20px"}}><div className="label">REVESENSE PRO</div><h2 style={{fontSize:30,marginTop:8}}>The market, personalized.</h2><p className="muted" style={{maxWidth:560,margin:"10px auto 20px"}}>Watchlist intelligence, personalized impact, custom alerts, and deeper sector signals. Free stays public. Pro becomes yours.</p><a className="btn primary" href="#top">Explore Pro</a></div></section>
      <footer className="shell footer"><span>REVESENSE · A REVE ecosystem product</span><span>See what matters. Before the noise.</span></footer>
    </main>
  );
}
