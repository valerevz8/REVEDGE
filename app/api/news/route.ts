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
  if (/bitcoin|btc|etf/.test(x)) return "BTC";
  if (/ethereum|eth|layer 2|l2/.test(x)) return "ETH";
  if (/solana|\bsol\b/.test(x)) return "SOL";
  if (/xrp|ripple/.test(x)) return "XRP";
  if (/meme|doge|shib|pepe|bonk|wif/.test(x)) return "MEME";
  if (/fed|fomc|inflation|cpi|pce|rate|treasury|yield|dollar|liquidity|jobs report|payroll/.test(x)) return "MACRO";
  if (/defi|dex|lending|stablecoin|on-chain/.test(x)) return "DEFI";
  if (/regulation|sec|cftc|congress|legislation|law|approval|approved|ban|lawsuit/.test(x)) return "REGULATION";
  return "CRYPTO";
}

function isTradingRelevant(text: string) {
  const x = text.toLowerCase();
  const directCrypto = /bitcoin|btc|ethereum|eth|solana|sol|xrp|ripple|dogecoin|doge|crypto|stablecoin|defi|exchange|etf|on-chain|altcoin|token/.test(x);
  const marketMacro = /fed|fomc|cpi|pce|inflation|rate cut|rate hike|treasury|yield|liquidity|dollar|jobs report|payroll/.test(x) && /crypto|bitcoin|btc|ethereum|eth|solana|etf|digital asset/.test(x);
  const catalyst = /etf|approval|approved|sec|cftc|regulation|liquidation|liquidations|hack|exploit|outflow|inflow|whale|unlock|listing|delist|fund|institutional|tariff|sanction|war|surge|crash|collapse|breakout|sell-off|selling|buying/.test(x);
  const fluff = /podcast|interview|opinion|price prediction|weekly roundup|best crypto|top crypto to buy|meme coin you should|could reach|will reach|analyst says.*million/.test(x);
  return directCrypto && !fluff || marketMacro || catalyst && directCrypto;
}

function score(text: string, source: string) {
  const x = text.toLowerCase();
  let v = 2.5;
  const highImpact = [
    "etf", "sec", "cftc", "fed", "fomc", "cpi", "pce", "rate cut", "rate hike", "liquidation", "liquidations",
    "hack", "exploit", "ban", "lawsuit", "approval", "approved", "regulation", "tariff", "sanction", "war",
    "collapse", "crash", "emergency", "outflow", "inflow", "institutional", "treasury", "liquidity",
  ];
  const marketMove = ["surge", "soar", "rally", "sell-off", "selling", "buying", "breakout", "breaks above", "breaks below", "record", "all-time high"];
  const relevance = ["bitcoin", "btc", "ethereum", "eth", "solana", "xrp", "dogecoin", "crypto", "stablecoin", "defi", "exchange", "whale", "unlock", "listing"];

  for (const word of highImpact) if (x.includes(word)) v += 1.25;
  for (const word of marketMove) if (x.includes(word)) v += 0.8;
  for (const word of relevance) if (x.includes(word)) v += 0.3;
  if (source === "CoinDesk") v += 0.35;
  if (source === "Cointelegraph") v += 0.2;
  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function direction(text: string): "Risk-on" | "Risk-off" | "Neutral" {
  const x = text.toLowerCase();
  if (/hack|exploit|ban|lawsuit|liquidation|crash|collapse|sanction|outflow|sell-off|selling|hawkish/.test(x)) return "Risk-off";
  if (/approval|approved|inflow|surge|rally|adoption|launch|partnership|record|buying|bullish|dovish/.test(x)) return "Risk-on";
  return "Neutral";
}

function affected(tag: string) {
  if (tag === "BTC" || tag === "MACRO" || tag === "REGULATION") return ["BTC", "ETH", "SOL", "ALT"];
  if (tag === "ETH") return ["ETH", "SOL", "ALT"];
  if (tag === "SOL") return ["SOL", "MEME", "ALT"];
  if (tag === "MEME") return ["MEME", "SOL"];
  return [tag];
}

function windowFor(impact: number) {
  if (impact >= 8.5) return "6–24H";
  if (impact >= 7) return "3–12H";
  if (impact >= 5.5) return "1–6H";
  return "<3H";
}

function urgencyFor(impact: number, iso: string) {
  const age = Date.now() - new Date(iso).getTime();
  if (impact >= 8 && age < 6 * 60 * 60 * 1000) return "NOW";
  if (impact >= 6) return "WATCH";
  return "LOW";
}

function whyFor(tag: string, d: string) {
  if (tag === "MACRO") return `Macro news can change liquidity expectations and therefore the BTC regime. ${d} risk should be confirmed with price and breadth.`;
  if (tag === "BTC") return `BTC is the primary market driver. A meaningful BTC move can propagate into ETH, SOL and high-beta alts.`;
  if (tag === "ETH") return `ETH can confirm or weaken broader alt participation. Watch ETH/BTC and whether SOL follows.`;
  if (tag === "SOL" || tag === "MEME") return `High-beta crypto can amplify the move. Confirm broader market direction before chasing sector strength.`;
  return `The event is relevant to crypto trading, but price confirmation is still required before treating it as actionable.`;
}

function extractItems(xml: string, source: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return blocks.slice(0, 15).map((block) => {
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
    return {
      title,
      link,
      source,
      publishedAt,
      impact,
      tag,
      direction: dir,
      urgency: urgencyFor(impact, publishedAt),
      window: windowFor(impact),
      confidence: Math.min(96, 64 + Math.round(impact * 2.5) + (source === "CoinDesk" ? 8 : source === "Cointelegraph" ? 5 : 2)),
      affected: affected(tag),
      why: whyFor(tag, dir),
    };
  }).filter(Boolean) as Array<any>;
}

export async function GET() {
  const responses = await Promise.allSettled(FEEDS.map(async (feed) => {
    const r = await fetch(feed.url, {
      headers: { "User-Agent": "REVEDGE/0.1 (+https://revedge.netlify.app)" },
      next: { revalidate: 60 },
    });
    if (!r.ok) throw 0;
    return extractItems(await r.text(), feed.name);
  }));

  const stories = responses.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  const unique = new Map<string, any>();
  for (const story of stories) unique.set(story.title.toLowerCase(), story);

  const curated = [...unique.values()]
    .filter((story) => {
      const age = Date.now() - new Date(story.publishedAt).getTime();
      return age >= 0 && age < 36 * 60 * 60 * 1000 && story.impact >= 6.2;
    })
    .sort((a, b) => (b.impact - a.impact) || (new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()))
    .slice(0, 8);

  return NextResponse.json(
    { stories: curated, sources: FEEDS.map((feed) => feed.name), updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
