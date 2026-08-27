import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|to|of|for|and|in|on|with|as|is|are)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(title: string) {
  return new Set(normalizeTitle(title).split(" ").filter((x) => x.length > 2));
}

function similarity(a: string, b: string) {
  const aa = tokenSet(a);
  const bb = tokenSet(b);
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  aa.forEach((token) => { if (bb.has(token)) common += 1; });
  return common / Math.max(aa.size, bb.size);
}

function lifecycle(story: any) {
  const ageHours = Math.max(0, (Date.now() - new Date(story.publishedAt).getTime()) / 3600000);
  const impact = Number(story.impact ?? 0);
  if (ageHours <= 1 && impact >= 8) return "NEW · NOW";
  if (ageHours <= 3 && impact >= 7.5) return "ACTIVE · NOW";
  if (ageHours <= 12 && impact >= 7.5) return "ACTIVE · WATCH";
  if (ageHours <= 24 && impact >= 7) return "FADING · WATCH";
  return "FADING";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    const response = await fetch(`${origin}/api/news?intelligence=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "news feed unavailable" }, { status: 503 });
    }

    const data = await response.json();
    const stories = Array.isArray(data.stories) ? data.stories : [];

    // Collapse near-duplicate headlines from different publishers so one real-world
    // event is treated as one catalyst instead of five separate alerts.
    const groups: any[] = [];
    for (const story of stories) {
      const match = groups.find((group) => similarity(group.primary.title, story.title) >= 0.55);
      if (match) {
        match.sources.add(story.source);
        match.items.push(story);
        if (Number(story.priority ?? 0) > Number(match.primary.priority ?? 0)) match.primary = story;
      } else {
        groups.push({ primary: story, sources: new Set([story.source]), items: [story] });
      }
    }

    const events = groups
      .map((group) => ({
        ...group.primary,
        eventId: normalizeTitle(group.primary.title).slice(0, 80),
        lifecycle: lifecycle(group.primary),
        corroboration: group.items.length,
        sources: Array.from(group.sources),
        related: group.items.slice(0, 5).map((item: any) => ({
          title: item.title,
          source: item.source,
          publishedAt: item.publishedAt,
          link: item.link,
        })),
      }))
      .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0));

    const now = events.filter((event) => event.lifecycle.includes("NOW"));
    const watch = events.filter((event) => event.lifecycle.includes("WATCH"));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      engine: "REVEDGE Event Intelligence v1",
      methodology: "impact × freshness × urgency + corroboration",
      activeCount: now.length,
      watchCount: watch.length,
      events: events.slice(0, 12),
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Netlify-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("REVEDGE intelligence engine error", error);
    return NextResponse.json({ ok: false, error: "intelligence engine unavailable" }, { status: 500 });
  }
}
