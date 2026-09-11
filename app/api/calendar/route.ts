import { NextResponse } from "next/server";
import { SCHEDULED_CATALYSTS, catalystUtcMs } from "../../lib/catalysts";

function zoneTime(utcMs: number, timeZone: string, zone: string) {
  return `${new Date(utcMs).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone })} ${zone}`;
}

export async function GET() {
  const now = Date.now();
  const end = now + 35 * 24 * 60 * 60 * 1000;
  const events = SCHEDULED_CATALYSTS.map((event) => {
    const utcMs = catalystUtcMs(event);
    return {
      ...event,
      wib: zoneTime(utcMs, "Asia/Jakarta", "WIB"),
      et: zoneTime(utcMs, "America/New_York", "ET"),
      uk: zoneTime(utcMs, "Europe/London", "UK"),
      utcMs,
    };
  }).filter((event) => event.utcMs >= now - 24 * 60 * 60 * 1000 && event.utcMs <= end);

  return NextResponse.json({ events, updatedAt: new Date().toISOString(), windowDays: 35 }, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=21600" } });
}
