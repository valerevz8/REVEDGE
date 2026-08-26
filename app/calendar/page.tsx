import EventCalendar from "../components/EventCalendar";

export default function CalendarPage() {
  return (
    <main>
      <header className="shell nav">
        <a className="brand" href="/"><span className="brand-rev">REV</span><span className="brand-edge">EDGE</span></a>
        <nav className="navlinks"><a href="/">High Impact</a><a href="/calendar" className="active-nav">Event Calendar</a></nav>
        <div className="navright"><span className="lang">EN / ID</span><a className="sign" href="/">Back to REVEDGE</a></div>
      </header>
      <div className="calendarhero shell"><div className="eyebrow">Know the risk before it arrives</div><h1><span className="hero-main">See the dates.</span><span className="hero-sub">Prepare before the volatility.</span></h1><p>REVEDGE maps the next high-impact macro events so traders can reduce surprise, prepare positions, and know exactly when the market deserves extra attention.</p></div>
      <EventCalendar />
      <footer className="shell footer"><span>REVEDGE · EVENT CALENDAR</span><span>Information → Preparation → Decision</span></footer>
    </main>
  );
}
