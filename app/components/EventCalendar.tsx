"use client";

import { useEffect, useMemo, useState } from "react";

type Event = {
  id: string; date: string; timeET: string; title: string;
  category: "MACRO" | "FED" | "LABOR"; impact: "HIGH" | "MEDIUM";
  source: string; note: string; wib: string; et: string; uk: string; utcMs: number;
};

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function daysUntil(ms: number) {
  const diff = ms - Date.now();
  if (diff <= 0) return "TODAY";
  const d = Math.ceil(diff / 86400000);
  return d === 1 ? "1D" : `${d}D`;
}

export default function EventCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "FED" | "MACRO">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => events.filter((e) => {
    if (filter === "ALL") return true;
    if (filter === "HIGH") return e.impact === "HIGH";
    return e.category === filter;
  }), [events, filter]);

  const nextHigh = events.find((e) => e.impact === "HIGH" && e.utcMs >= Date.now());

  return (
    <section className="shell section calendar-section" id="calendar">
      <div className="sectiontitle">
        <div><div className="label">Risk map · next 35 days</div><h2>Event Calendar</h2></div>
        <span className="sub">{loading ? "Loading official schedule…" : `${events.length} scheduled events`}</span>
      </div>

      {nextHigh && (
        <div className="calendar-next">
          <div><span className="label">NEXT HIGH-IMPACT EVENT</span><strong>{nextHigh.title}</strong><span>{nextHigh.wib} · {daysUntil(nextHigh.utcMs)}</span></div>
          <div className="next-note">{nextHigh.note}</div>
        </div>
      )}

      <div className="calendar-tabs">
        {(["ALL", "HIGH", "FED", "MACRO"] as const).map((tab) => (
          <button key={tab} className={`calendar-tab ${filter === tab ? "active" : ""}`} onClick={() => setFilter(tab)}>{tab === "HIGH" ? "HIGH IMPACT" : tab}</button>
        ))}
      </div>

      <div className="calendar-list">
        {filtered.map((event) => (
          <article className={`eventrow ${event.impact === "HIGH" ? "event-high" : ""}`} key={event.id}>
            <div className="eventdate"><b>{dayLabel(event.date)}</b><span>{daysUntil(event.utcMs)}</span></div>
            <div className="eventmain"><div className="eventtags"><span className={`eventimpact ${event.impact.toLowerCase()}`}>{event.impact} IMPACT</span><span className="eventcat">{event.category}</span><span className="eventsource">{event.source}</span></div><h3>{event.title}</h3><p>{event.note}</p></div>
            <div className="eventtimes"><div><span>WIB</span><b>{event.wib.replace(/^.*?, /, "")}</b></div><div><span>ET</span><b>{event.et.replace(/^.*?, /, "")}</b></div><div><span>UK</span><b>{event.uk.replace(/^.*?, /, "")}</b></div></div>
          </article>
        ))}
        {!loading && filtered.length === 0 && <div className="card newsempty">No scheduled events in this filter window.</div>}
      </div>

      <div className="calendar-footer"><span>HIGH = decision-risk catalyst · MEDIUM = monitor</span><span>Schedules can change; REVEDGE should verify against the official source before the event.</span></div>
    </section>
  );
}
