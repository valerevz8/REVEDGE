import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

/**
 * One scheduled ingestion pass per minute.
 * The browser never fans out to the external RSS sources directly.
 */
export default async () => {
  const siteUrl = process.env.URL;
  if (!siteUrl) throw new Error("Netlify URL is unavailable");

  const response = await fetch(`${siteUrl}/api/news?scheduled_refresh=1`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });

  if (!response.ok) {
    throw new Error(`News refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const store = getStore("revedge-intelligence");

  await store.setJSON("latest-news", {
    ...data,
    refreshedAt: new Date().toISOString(),
  });

  console.log("REVEDGE intelligence snapshot refreshed", data.stories?.length ?? 0);
};

export const config: Config = {
  schedule: "* * * * *",
};
