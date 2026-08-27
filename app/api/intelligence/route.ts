import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";
import { buildIntelligence, type RawStory, type EventState } from "../../lib/intelligence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSnapshot() {
  const store = getStore("revedge-intelligence");
  const cached = await store.get("latest-intelligence", { type: "json" });
  if (cached) return cached as any;

  const news = await store.get("latest-news", { type: "json" });
  if (!news) return null;

  const result = buildIntelligence(Array.isArray(news.stories) ? news.stories as RawStory[] : [], []);
  return result.snapshot;
}

export async function GET() {
  try {
    const data = await getSnapshot();
    if (!data) {
      return NextResponse.json({ ok: false, error: "intelligence snapshot warming up" }, { status: 503 });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
        "CDN-Cache-Control": "public, max-age=15, stale-while-revalidate=30",
        "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("REVEDGE intelligence engine error", error);
    return NextResponse.json({ ok: false, error: "intelligence engine unavailable" }, { status: 500 });
  }
}
