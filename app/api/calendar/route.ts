import { NextResponse } from "next/server";

type Event = {
  id: string;
  date: string;
  timeET: string;
  title: string;
  category: "MACRO" | "FED" | "LABOR";
  impact: "HIGH" | "MEDIUM";
  source: string;
  note: string;
};

// Official scheduled dates currently available from U.S. Federal Reserve, BLS and BEA.
// Keep this feed deliberately conservative: REVEDGE should prefer a missing event over an invented one.
const EVENTS: Event[] = [
  { id: "jolts-2026-09-01", date: "2026-09-01", timeET: "10:00", title: "JOLTS Job Openings", category: "LABOR", impact: "MEDIUM", source: "BLS", note: "Labor-demand signal; can shift rate expectations if materially surprising." },
  { id: "nfp-2026-09-04", date: "2026-09-04", timeET: "08:30", title: "Employment Situation / NFP", category: "LABOR", impact: "HIGH", source: "BLS", note: "Major labor-market catalyst. Expect volatility in USD, yields and crypto around the print." },
  { id: "ppi-2026-09-10", date: "2026-09-10", timeET: "08:30", title: "PPI — August", category: "MACRO", impact: "HIGH", source: "BLS", note: "Inflation input ahead of CPI and FOMC; watch USD/yields and BTC reaction." },
  { id: "cpi-2026-09-11", date: "2026-09-11", timeET: "08:30", title: "CPI — August", category: "MACRO", impact: "HIGH", source: "BLS", note: "Primary inflation catalyst. Hot/cold surprise can rapidly reprice Fed expectations." },
  { id: "fomc-2026-09-15", date: "2026-09-15", timeET: "—", title: "FOMC Meeting — Day 1", category: "FED", impact: "HIGH", source: "Federal Reserve", note: "Policy meeting begins. Treat the surrounding session as elevated-risk." },
  { id: "fomc-2026-09-16", date: "2026-09-16", timeET: "14:00", title: "FOMC Decision + Press Conference", category: "FED", impact: "HIGH", source: "Federal Reserve", note: "Rate decision and press conference. Key reaction window for BTC, USD and yields." },
  { id: "trade-2026-09-03", date: "2026-09-03", timeET: "08:30", title: "U.S. Trade Balance", category: "MACRO", impact: "MEDIUM", source: "BEA", note: "Macro flow data; secondary crypto impact unless the surprise is large." },
  { id: "pce-2026-09-30", date: "2026-09-30", timeET: "08:30", title: "PCE / Personal Income & Outlays — August", category: "MACRO", impact: "HIGH", source: "BEA", note: "Core PCE is a major Fed-sensitive inflation signal. Watch USD/yields first, then BTC breadth." },
];

function toUtc(date: string, timeET: string) {
  if (timeET === "—") return null;
  const [hour, minute] = timeET.split(":").map(Number);
  // ET is UTC-4 during September 2026 (EDT).
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hour + 4, minute));
}

function zoneTime(event: Event, timeZone: string, zone: string) {
  const utc = toUtc(event.date, event.timeET);
  if (!utc) return "TBD";
  return `${utc.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone })} ${zone}`;
}

export async function GET() {
  const now = Date.now();
  const end = now + 35 * 24 * 60 * 60 * 1000;
  const upcoming = EVENTS.map((event) => ({
    ...event,
    wib: zoneTime(event, "Asia/Jakarta", "WIB"),
    et: zoneTime(event, "America/New_York", "ET"),
    uk: zoneTime(event, "Europe/London", "UK"),
    utcMs: toUtc(event.date, event.timeET)?.getTime() ?? Date.UTC(Number(event.date.slice(0, 4)), Number(event.date.slice(5, 7)) - 1, Number(event.date.slice(8, 10))),
  })).filter((event) => event.utcMs >= now - 24 * 60 * 60 * 1000 && event.utcMs <= end);

  return NextResponse.json({ events: upcoming, updatedAt: new Date().toISOString(), windowDays: 35 }, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=21600" } });
}
