import { NextResponse } from "next/server";

const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
];

function clean(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function tagFor(title: string) {
  const t = title.toLowerCase();
  if (/bitcoin|btc|etf/.test(t)) return "BTC";
  if (/ethereum|eth|layer 2|l2/.test(t)) return "ETH";
  if (/solana|sol/.test(t)) return "SOL";
  if (/meme|doge|shib|pepe|bonk|wif/.test(t)) return "MEME";
  if (/fed|fomc|inflation|cpi|pce|rate|treasury|yield|dollar|macro/.test(t)) return "MACRO";
  if (/ai|artificial intelligence|compute/.test(t)) return "AI";
  if (/defi|dex|lending|stablecoin/.test(t)) return "DEFI";
  return "CRYPTO";
}

function score(title: string) {
  const t = title.toLowerCase();
  let value = 4;
  const strong = ["etf", "sec", "fed", "fomc", "hack", "exploit", "ban", "approval", "approved", "lawsuit", "liquidation", "tariff", "war", "sanction", "collapse", "surge", "crash", "emergency", "rate cut", "rate hike"];
  const medium = ["bitcoin", "ethereum", "solana", "stablecoin", "regulation", "institutional", "whale", "fund", "exchange", "listing", "unlock"];
  strong.forEach((word) => { if (t.includes(word)) value += 1.3; });
  medium.forEach((word) => { if (t.includes(word)) value += 0.35; });
  return Math.max(1, Math.min(10, Math.round(value * 10) / 10));
}

function direction(title: string): "Risk-on" | "Risk-off" | "Neutral" {
  const t = title.toLowerCase();
  if (/hack|exploit|ban|lawsuit|liquidation|crash|collapse|sanction|outflow|sell-off|selling/.test(t)) return "Risk-off";
  if (/approval|approved|inflow|surge|adoption|launch|partnership|record|buying|bullish/.test(t)) return "Risk-on";
  return "Neutral";
}

function extractItems(xml: string, source: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return blocks.slice(0, 12).map((block) => {
    const title = clean(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = clean(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "");
    const published = clean(block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] ?? "");
    if (!title || !link) return null;
    const publishedAt = new Date(published).toISOString();
    return { title, link, source, publishedAt, impact: score(title), tag: tagFor(title), direction: direction(title) };
  }).filter(Boolean) as Array<{ title: string; link: string; source: string; publishedAt: string; impact: number; tag: string; direction: "Risk-on" | "Risk-off" | "Neutral" }>;
}

export async function GET() {
  const responses = await Promise.allSettled(FEEDS.map(async (feed) => {
    const response = await fetch(feed.url, { headers: { "User-Agent": "REVEDGE/0.1 (+https://revedge.netlify.app)" }, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`${feed.name} unavailable`);
    return extractItems(await response.text(), feed.name);
  }));

  const stories = responses.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const unique = new Map<string, (typeof stories)[number]>();
  for (const story of stories) unique.set(story.title.toLowerCase(), story);

  const curated = [...unique.values()]
    .filter((story) => Date.now() - new Date(story.publishedAt).getTime() < 48 * 60 * 60 * 1000)
    .sort((a, b) => (b.impact - a.impact) || (new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()))
    .slice(0, 12);

  return NextResponse.json({ stories: curated, sources: FEEDS.map((f) => f.name), updatedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
  });
}
