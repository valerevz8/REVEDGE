import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { buildIntelligence, type EventState, type MarketContext } from "../../app/lib/intelligence";
import { buildPredictiveLayer } from "../../app/lib/predictive";

export default async () => {
  const siteUrl = process.env.URL;
  if (!siteUrl) throw new Error("Netlify URL is unavailable");

  const [newsResponse, marketResponse] = await Promise.all([
    fetch(`${siteUrl}/api/news?scheduled_refresh=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache", "User-Agent": "REVEDGE-Scheduler/2.0" } }),
    fetch(`${siteUrl}/api/market?scheduled_refresh=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache", "User-Agent": "REVEDGE-Scheduler/2.0" } }),
  ]);
  if (!newsResponse.ok) throw new Error(`News refresh failed: ${newsResponse.status}`);

  const data = await newsResponse.json();
  const market: MarketContext | undefined = marketResponse.ok ? await marketResponse.json() : undefined;
  const store = getStore("revedge-intelligence");
  const previous = await store.get("event-state", { type: "json" }) as EventState[] | null;
  const result = buildIntelligence(Array.isArray(data.stories) ? data.stories : [], Array.isArray(previous) ? previous : [], market);

  const events = result.snapshot.events.map((event) => {
    const predictive = buildPredictiveLayer(event, market);
    const direction = event.scheduled ? predictive.scenarioBias : event.direction;
    return { ...event, direction, bias: direction === "Risk-on" ? "Bullish" : direction === "Risk-off" ? "Bearish" : "Neutral", predictive };
  });
  const snapshot = { ...result.snapshot, events, stories: events };

  await Promise.all([
    store.setJSON("latest-news", { ...data, refreshedAt: new Date().toISOString() }),
    store.setJSON("latest-intelligence", snapshot),
    store.setJSON("event-state", result.state),
  ]);

  console.log("REVEDGE V3 intelligence snapshot refreshed", { events: snapshot.events.length, active: snapshot.activeCount, watch: snapshot.watchCount, escalations: snapshot.escalations });
};

export const config: Config = { schedule: "* * * * *" };
