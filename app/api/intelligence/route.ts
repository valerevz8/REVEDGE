import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";
import { buildIntelligence, type RawStory, type EventState, type MarketContext } from "../../lib/intelligence";
import { buildPredictiveLayer } from "../../lib/predictive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSnapshot() {
  const store = getStore("revedge-intelligence");
  const [cached, news, market] = await Promise.all([
    store.get("latest-intelligence", { type: "json" }),
    store.get("latest-news", { type: "json" }),
    fetch(new URL("/api/market", process.env.URL ?? "http://localhost:3000"), { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);

  // Rebuild from the latest raw news when possible so scheduled catalyst direction
  // follows the current market regime instead of becoming stale between cron passes.
  if (news && Array.isArray((news as any).stories)) {
    const previous = cached && Array.isArray((cached as any).events)
      ? ((cached as any).events as any[]).map((e) => ({ eventId:e.eventId, firstSeenAt:e.firstSeenAt, lastSeenAt:e.lastSeenAt, lifecycle:e.lifecycle, impact:e.impact, corroboration:e.corroboration, sourceCount:e.sourceCount })) as EventState[]
      : [];
    return buildIntelligence((news as any).stories as RawStory[], previous, market as MarketContext | undefined).snapshot;
  }

  if (cached) return cached as any;
  return null;
}

function enrich(snapshot: any, market: MarketContext | null) {
  if (!snapshot?.events) return snapshot;
  const events = snapshot.events.map((event: any) => {
    const predictive = buildPredictiveLayer(event, market ?? undefined, snapshot.events.find((e:any) => e.scheduled && e.lifecycle === "PRE-EVENT" && e.eventId !== event.eventId) ?? undefined);
    const direction = event.scheduled && event.lifecycle === "PRE-EVENT" ? predictive.scenarioBias : event.direction;
    const bias = direction === "Risk-on" ? "Bullish" : direction === "Risk-off" ? "Bearish" : "Neutral";
    return { ...event, direction, bias, predictive };
  });
  return { ...snapshot, events, stories: events };
}

export async function GET() {
  try {
    const [snapshot, market] = await Promise.all([
      getSnapshot(),
      fetch(new URL("/api/market", process.env.URL ?? "http://localhost:3000"), { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (!snapshot) return NextResponse.json({ ok:false, error:"intelligence snapshot warming up" }, { status:503 });
    return NextResponse.json(enrich(snapshot, market), { headers:{ "Cache-Control":"public, max-age=0, s-maxage=15, stale-while-revalidate=30", "CDN-Cache-Control":"public, max-age=15, stale-while-revalidate=30", "Netlify-CDN-Cache-Control":"public, durable, max-age=15, stale-while-revalidate=30" } });
  } catch(error) {
    console.error("REVEDGE intelligence engine error",error);
    return NextResponse.json({ok:false,error:"intelligence engine unavailable"},{status:500});
  }
}
