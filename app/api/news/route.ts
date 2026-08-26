import { NextResponse } from "next/server";

const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
];

function clean(v: string) {
  return v.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function tagFor(text: string) {
  const x = text.toLowerCase();
  if (/bitcoin|\bbtc\b|spot bitcoin etf|bitcoin etf/.test(x)) return "BTC";
  if (/ethereum|\beth\b|ethereum etf/.test(x)) return "ETH";
  if (/solana|\bsol\b/.test(x)) return "SOL";
  if (/meme|doge|shib|pepe|bonk|wif/.test(x)) return "MEME";
  if (/fed|fomc|inflation|cpi|pce|rate|treasury|yield|dollar|liquidity|jobs report|payroll/.test(x)) return "MACRO";
  if (/stablecoin|defi|dex|lending|on-chain/.test(x)) return "DEFI";
  if (/sec|cftc|congress|regulation|legislation|approval|approved|ban|lawsuit|court/.test(x)) return "REGULATION";
  return "CRYPTO";
}

function isTradingRelevant(text: string) {
  const x = text.toLowerCase();
  const crypto = /bitcoin|btc|ethereum|eth|solana|sol|crypto|stablecoin|defi|exchange|etf|digital asset|altcoin/.test(x);
  const macro = /fed|fomc|cpi|pce|inflation|rate cut|rate hike|treasury|yield|liquidity|jobs report|payroll/.test(x) && crypto;
  const hardCatalyst = /etf|sec|cftc|approval|approved|regulation|ban|lawsuit|liquidation|liquidations|hack|exploit|outflow|inflow|institutional|tariff|sanction|war|emergency|collapse|crash/.test(x);
  const marketMove = /(bitcoin|btc|ethereum|eth|solana|crypto).{0,80}(surge|soar|rally|sell-off|crash|collapse|breakout|breaks above|breaks below|record|all-time high|liquidation)/.test(x);
  const fluff = /podcast|interview|opinion|price prediction|weekly roundup|best crypto|top crypto to buy|could reach|will reach|analyst says.*million|sponsored/.test(x);
  return !fluff && (macro || (crypto && hardCatalyst) || marketMove);
}

function score(text: string, source: string) {
  const x = text.toLowerCase();
  let v = 4;
  const systemic = ["hack", "exploit", "collapse", "emergency", "stablecoin depeg", "bankruptcy", "exchange failure", "war", "sanction", "ban", "sec lawsuit", "cftc", "fed", "fomc", "cpi", "pce"];
  const majorCatalyst = ["etf", "sec", "approval", "approved", "regulation", "lawsuit", "liquidation", "liquidations", "outflow", "inflow", "institutional", "tariff", "treasury", "liquidity"];
  const marketMove = ["surge", "soar", "rally", "sell-off", "crash", "collapse", "breakout", "breaks above", "breaks below", "record", "all-time high"];
  const magnitude = ["billion", "$1b", "$2b", "$3b", "$500m", "$400m", "$300m", "largest", "massive", "record"];
  for (const word of systemic) if (x.includes(word)) v += 2.0;
  for (const word of majorCatalyst) if (x.includes(word)) v += 1.0;
  for (const word of marketMove) if (x.includes(word)) v += 0.7;
  for (const word of magnitude) if (x.includes(word)) v += 0.7;
  if (source === "CoinDesk") v += 0.35;
  if (source === "Cointelegraph") v += 0.2;
  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function direction(text: string): "Risk-on" | "Risk-off" | "Neutral" {
  const x = text.toLowerCase();
  if (/hack|exploit|ban|lawsuit|liquidation|crash|collapse|sanction|outflow|sell-off|selling|hawkish|depeg/.test(x)) return "Risk-off";
  if (/approval|approved|inflow|surge|rally|adoption|launch|partnership|record|buying|bullish|dovish/.test(x)) return "Risk-on";
  return "Neutral";
}

function affected(tag: string) {
  if (tag === "BTC" || tag === "MACRO" || tag === "REGULATION") return ["BTC", "ETH", "SOL", "ALT"];
  if (tag === "ETH") return ["ETH", "SOL", "ALT"];
  if (tag === "SOL") return ["SOL", "MEME", "ALT"];
  if (tag === "MEME") return ["MEME", "SOL"];
  return [tag, "ALT"];
}

function windowFor(impact: number) {
  if (impact >= 8.5) return "6–24H";
  if (impact >= 7.5) return "3–12H";
  return "1–6H";
}

function urgencyFor(impact: number, iso: string): "NOW" | "WATCH" {
  const age = Date.now() - new Date(iso).getTime();
  if (impact >= 8 && age < 6 * 60 * 60 * 1000) return "NOW";
  return "WATCH";
}

function whyFor(tag: string, d: string) {
  if (tag === "MACRO") return `This macro catalyst can change liquidity and rate expectations across crypto. ${d} risk needs confirmation from BTC and broader breadth.`;
  if (tag === "BTC") return `BTC is the primary market driver. This event can propagate through ETH, SOL and high-beta alts, so the tradeable question is whether price confirms the headline.`;
  if (tag === "ETH") return `ETH is a key confirmation layer for alt participation. The important read is whether ETH strength or weakness spreads into SOL and broader alts.`;
  if (tag === "SOL" || tag === "MEME") return `High-beta assets can amplify both directions. The event matters because it can change risk appetite, but sector confirmation should come before chasing.`;
  return `This is a genuine crypto trading catalyst with potential market consequences. Price and breadth confirmation still determine whether it becomes actionable.`;
}

function guidanceFor(tag: string, d: string) {
  if (d === "Risk-off") return {
    whatToDo: "Reduce new high-beta exposure and wait for BTC/breadth to stabilize before looking for a long.",
    avoid: "Catching falling high-beta assets while the catalyst is still repricing the market.",
    watch: ["BTC stabilization", "TOTAL3 breadth", "liquidation pressure fading"],
    invalidation: "BTC/breadth continue lower and liquidation pressure accelerates.",
  };
  if (tag === "MACRO") return {
    whatToDo: "Wait for BTC to confirm the macro reaction; do not trade the macro headline in isolation.",
    avoid: "Taking directional exposure before rate expectations and price reaction settle.",
    watch: ["BTC reaction", "TOTAL3 breadth", "DXY / yields reaction"],
    invalidation: "BTC loses structure while breadth contracts.",
  };
  return {
    whatToDo: "Let BTC → ETH → SOL → TOTAL3 confirm before increasing risk; strongest relative strength gets priority.",
    avoid: "Chasing the first candle or buying high-beta laggards simply because the headline is bullish.",
    watch: ["BTC confirmation", "SOL/ETH strength", "TOTAL3 expansion"],
    invalidation: "BTC fails the move and broader breadth does not follow.",
  };
}

function extractItems(xml: string, source: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return blocks.slice(0, 20).map((block) => {
    const title = clean(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = clean(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "");
    const published = clean(block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] ?? "");
    const description = clean(block.match(/<(?:description|content:encoded)[^>]*>([\s\S]*?)<\/(?:description|content:encoded)>/i)?.[1] ?? "");
    if (!title || !link || !published) return null;
    const publishedAt = new Date(published).toISOString();
    const fullText = `${title} ${description}`;
    if (!isTradingRelevant(fullText)) return null;
    const tag = tagFor(fullText);
    const impact = score(fullText, source);
    const dir = direction(fullText);
    const guidance = guidanceFor(tag, dir);
    return {
      title, link, source, publishedAt, impact, tag, direction: dir,
      urgency: urgencyFor(impact, publishedAt), window: windowFor(impact),
      confidence: Math.min(96, 68 + Math.round(impact * 2) + (source === "CoinDesk" ? 7 : source === "Cointelegraph" ? 4 : 2)),
      affected: affected(tag), why: whyFor(tag, dir),
      whatToDo: guidance.whatToDo, avoid: guidance.avoid, whatToWatch: guidance.watch, invalidation: guidance.invalidation,
    };
  }).filter(Boolean) as Array<any>;
}

export async function GET() {
  const responses = await Promise.allSettled(FEEDS.map(async (feed) => {
    const r = await fetch(feed.url, { headers: { "User-Agent": "REVEDGE/0.2 (+https://revedge.netlify.app)" }, next: { revalidate: 60 } });
    if (!r.ok) throw 0;
    return extractItems(await r.text(), feed.name);
  }));
  const stories = responses.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  const unique = new Map<string, any>();
  for (const story of stories) unique.set(story.title.toLowerCase(), story);
  const curated = [...unique.values()]
    .filter((story) => {
      const age = Date.now() - new Date(story.publishedAt).getTime();
      return age >= 0 && age < 36 * 60 * 60 * 1000 && story.impact >= 7.5;
    })
    .sort((a, b) => (b.impact - a.impact) || (new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()))
    .slice(0, 3);
  return NextResponse.json({ stories: curated, sources: FEEDS.map((feed) => feed.name), updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } });
}
