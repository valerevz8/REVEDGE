import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { buildIntelligence, type EventState } from "../../app/lib/intelligence";

/**
 * One scheduled ingestion pass per minute.
 * The browser never fans out to external RSS sources directly.
 * The scheduled pass refreshes raw news once, then derives the intelligence
 * snapshot from that same payload and persists the lightweight state needed
 * to detect NEW / ESCALATED / CONFIRMED / FADING transitions.
 */
export default async () => {
  const siteUrl = process.env.URL;
  if (!siteUrl) throw new Error("Netlify URL is unavailable");

  const response = await fetch(`${siteUrl}/api/news?scheduled_refresh=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      "User-Agent": "REVEDGE-Scheduler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`News refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const store = getStore("revedge-intelligence");
  const previous = await store.get("event-state", { type: "json" }) as EventState[] | null;
  const result = buildIntelligence(Array.isArray(data.stories) ? data.stories : [], Array.isArray(previous) ? previous : []);

  await Promise.all([
    store.setJSON("latest-news", {
      ...data,
      refreshedAt: new Date().toISOString(),
    }),
    store.setJSON("latest-intelligence", result.snapshot),
    store.setJSON("event-state", result.state),
  ]);

  console.log("REVEDGE intelligence snapshot refreshed", {
    events: result.snapshot.events.length,
    active: result.snapshot.activeCount,
    watch: result.snapshot.watchCount,
    escalations: result.snapshot.escalations,
  });
};

export const config: Config = {
  schedule: "* * * * *",
};
