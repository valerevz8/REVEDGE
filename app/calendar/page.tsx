import EventCalendar from "../components/EventCalendar";
import { HeaderPreferences } from "../components/Preferences";

export default function CalendarPage() {
  return (
    <main>
      <style>{`.brand-logo{display:block;width:138px;height:auto;max-height:40px;object-fit:contain}@media(max-width:800px){.brand-logo{width:116px;max-height:34px}}`}</style>
      <header className="shell nav">
        <a className="brand" href="/" aria-label="HALVER"><img className="brand-logo" src="/halver-logo.svg" alt="HALVER" /></a>
        <nav className="navlinks"><a href="/">High Impact</a><a href="/calendar" className="active-nav">Event Calendar</a></nav>
        <div className="navright"><HeaderPreferences /><a className="sign re-back" href="/" aria-label="Back to HALVER" title="Back to HALVER"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></a></div>
      </header>
      <div className="calendarhero shell"><div className="eyebrow">Know the risk before it arrives</div><h1><span className="hero-main">See the dates.</span><span className="hero-sub">Prepare before the volatility.</span></h1><p>HALVER maps the next high-impact macro events so traders can reduce surprise, prepare positions, and know exactly when the market deserves extra attention.</p></div>
      <EventCalendar />
      <footer className="shell footer"><span>HALVER · EVENT CALENDAR</span><span>Information → Preparation → Decision</span></footer>
    </main>
  );
}
