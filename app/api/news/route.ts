import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";

// REVEDGE is decision-first: discover broadly, rank by impact *and* freshness,
// then surface only events that can change a trader's decision now.
const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
  { name: "Google News · Crypto", url: "https://news.google.com/rss/search?q=crypto%20bitcoin%20ethereum%20solana%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
  { name: "Google News · Macro", url: "https://news.google.com/rss/search?q=Fed%20CPI%20PCE%20Treasury%20yields%20crypto%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
  { name: "Google News · Regulation", url: "https://news.google.com/rss/search?q=SEC%20CFTC%20crypto%20regulation%20ETF%20stablecoin%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
  { name: "Google News · Market Shock", url: "https://news.google.com/rss/search?q=bitcoin%20liquidation%20hack%20exploit%20crypto%20crash%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
];

function clean(v: string) {
  return v.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
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
  const macro = /fed|fomc|cpi|pce|inflation|rate cut|rate hike|treasury|yield|liquidity|jobs report|payroll/.test(x) && (crypto || /fed|fomc|cpi|pce|treasury|yield/.test(x));
  const hardCatalyst = /etf|sec|cftc|approval|approved|regulation|lawsuit|liquidation|liquidations|hack|exploit|outflow|inflow|institutional|tariff|sanction|war|emergency|collapse|crash|depeg|bankruptcy/.test(x);
  const marketMove = /(bitcoin|btc|ethereum|eth|solana|crypto).{0,100}(surge|soar|rally|sell-off|crash|collapse|breakout|breaks above|breaks below|record|all-time high|liquidation)/.test(x);
  const fluff = /podcast|interview|opinion|price prediction|weekly roundup|best crypto|top crypto to buy|could reach|will reach|sponsored|casino/.test(x);
  return !fluff && (macro || (crypto && hardCatalyst) || marketMove);
}

function score(text: string, source: string) {
  const x = text.toLowerCase();
  let v = 4;
  const systemic = ["hack", "exploit", "collapse", "emergency", "stablecoin depeg", "bankruptcy", "exchange failure", "war", "sanction", "ban", "sec lawsuit", "cftc", "fed", "fomc", "cpi", "pce"];
  const majorCatalyst = ["etf", "sec", "approval", "approved", "regulation", "lawsuit", "liquidation", "liquidations", "outflow", "inflow", "institutional", "tariff", "treasury", "liquidity"];
  const marketMove = ["surge", "soar", "rally", "sell-off", "crash", "collapse", "breakout", "breaks above", "breaks below", "record", "all-time high"];
  const magnitude = ["billion", "$1b", "$2b", "$3b", "$500m", "$400m", "$300m", "$445m", "largest", "massive", "record"];
  for (const word of systemic) if (x.includes(word)) v += 2;
  for (const word of majorCatalyst) if (x.includes(word)) v += 1;
  for (const word of marketMove) if (x.includes(word)) v += .7;
  for (const word of magnitude) if (x.includes(word)) v += .7;
  if (/breaking|just in|urgent|now|minutes ago|hours ago/.test(x)) v += .6;
  if (source === "CoinDesk") v += .35;
  if (source === "Cointelegraph") v += .2;
  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function direction(text: string): "Risk-on" | "Risk-off" | "Neutral" {
  const x = text.toLowerCase();
  if (/hack|exploit|ban|lawsuit|liquidation|crash|collapse|sanction|outflow|sell-off|selling|hawkish|depeg|hotter inflation/.test(x)) return "Risk-off";
  if (/approval|approved|inflow|surge|rally|adoption|launch|partnership|record|buying|bullish|dovish|lower yields/.test(x)) return "Risk-on";
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

function freshness(iso: string) {
  const age = Math.max(0, Date.now() - new Date(iso).getTime());
  const hours = age / 3600000;
  if (hours <= 1) return 3;
  if (hours <= 3) return 2.2;
  if (hours <= 6) return 1.2;
  if (hours <= 12) return .2;
  if (hours <= 24) return -.8;
  return -2;
}

function urgencyFor(impact: number, iso: string): "NOW" | "WATCH" | "FADING" {
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (impact >= 8 && hours < 3) return "NOW";
  if (hours < 12 && impact >= 7.5) return "WATCH";
  return "FADING";
}

function regimeFor(tag: string, d: string) {
  if (d === "Risk-off") return "Cautious";
  if (d === "Risk-on") return "Risk-On";
  if (tag === "MACRO") return "Cautious";
  return "Mixed";
}

function biasFor(d: string, tag: string) {
  if (d === "Risk-off") return "Bearish";
  if (d === "Risk-on") return "Bullish";
  return tag === "MACRO" ? "Neutral" : "Wait for confirmation";
}

function sharpHeadline(tag: string, d: string, title: string) {
  const x = title.toLowerCase();
  if (tag === "MACRO" && /pce/.test(x)) return d === "Risk-off" ? "HOTTER PCE → BTC UPSIDE FACES MACRO HEADWIND" : "PCE → BTC REACTION NOW SETS THE NEXT MOVE";
  if (tag === "MACRO") return d === "Risk-off" ? "MACRO SHOCK → BTC UPSIDE NOW NEEDS ABSORPTION" : "MACRO CATALYST → BTC MUST CONFIRM BEFORE RISK EXPANDS";
  if (tag === "BTC") return d === "Risk-off" ? "BTC CATALYST → BREAKOUT STRUCTURE UNDER PRESSURE" : "BTC CATALYST → BREAKOUT NEEDS FOLLOW-THROUGH";
  if (tag === "ETH") return d === "Risk-off" ? "ETH CATALYST → ALT RISK REMAINS VULNERABLE" : "ETH CATALYST → ALT ROTATION NEEDS CONFIRMATION";
  if (tag === "SOL" || tag === "MEME") return d === "Risk-off" ? "HIGH-BETA SHOCK → SOL / MEME RISK STAYS FRAGILE" : "HIGH-BETA CATALYST → SOL / MEME ROTATION IN PLAY";
  return d === "Risk-off" ? "CRYPTO CATALYST → RISK REPRICING TAKES PRIORITY" : "CRYPTO CATALYST → PRICE CONFIRMATION IS THE TRADE";
}

function whyFor(tag: string, d: string) {
  if (tag === "MACRO") return d === "Risk-off" ? ["The catalyst changes liquidity or rate expectations across crypto.", "The bearish signal matters most when BTC is already extended or below a key breakout level.", "Core price reaction matters more than the headline after the first volatility burst."] : ["The catalyst can shift liquidity and rate expectations across crypto.", "BTC is the first confirmation layer; alts only matter after BTC absorbs the event.", "The trade is the reaction, not the headline itself."];
  if (tag === "BTC") return ["BTC is the primary market driver and can transmit the catalyst into ETH, SOL and alts.", "A headline without price confirmation is information, not a setup.", "Follow-through and breadth decide whether the move is real."];
  if (tag === "ETH") return ["ETH is a key confirmation layer for alt participation.", "Strength that fails to spread into SOL / broader breadth is weak rotation.", "The setup improves only when relative strength survives the first reaction."];
  return ["This catalyst can move risk appetite beyond the directly affected asset.", "High-beta names amplify both upside and downside when liquidity shifts.", "Price and breadth confirmation determine whether it becomes actionable."];
}

function guidanceFor(tag: string, d: string) {
  if (d === "Risk-off") return {
    narrative: "Macro caution", setup: "WAIT FOR POST-EVENT PRICE ACTION",
    whatToDo: "Reduce new high-beta exposure and wait for BTC / breadth to stabilize.",
    avoid: "Blind longs immediately after the print or headline.", watch: ["BTC", "ETH", "SOL", "USD / Yields"],
    triggers: ["Reclaim key BTC level + hold", "Reclaim key ETH level + outperform BTC", "Reclaim key SOL level", "USD / yields reverse lower after catalyst"],
    invalidations: ["Lose key BTC support", "Continued ETH underperformance", "Sustained SOL weakness", "USD / yields continue higher"],
    final: "REDUCE RISK / NO NEW LONGS", bull: "BTC holds support + reclaims the breakout level + ETH/SOL strengthen", bear: "BTC loses support + USD/yields stay firm + breadth contracts",
  };
  return {
    narrative: d === "Risk-on" ? "Risk-on rotation" : "Wait for confirmation", setup: "WAIT FOR PRICE + BREADTH CONFIRMATION",
    whatToDo: "Let BTC → ETH → SOL → TOTAL3 confirm before increasing risk.",
    avoid: "Chasing the first candle or buying laggards because the headline looks bullish.", watch: ["BTC", "ETH", "SOL", "TOTAL2 / TOTAL3"],
    triggers: ["BTC breaks and holds catalyst level", "ETH outperforms BTC", "SOL confirms risk appetite", "TOTAL3 breadth expands"],
    invalidations: ["BTC fails the breakout", "ETH loses relative strength", "SOL remains weak", "Breadth contracts"],
    final: "TRADE THE CONFIRMATION", bull: "BTC holds the move + ETH/SOL confirm + breadth expands", bear: "BTC rejects + ETH/SOL lag + breadth fails to follow",
  };
}

function extractItems(xml: string, source: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return blocks.slice(0, 30).map((block) => {
    const title = clean(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = clean(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "");
    const published = clean(block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] ?? "");
    const description = clean(block.match(/<(?:description|content:encoded)[^>]*>([\s\S]*?)<\/(?:description|content:encoded)>/i)?.[1] ?? "");
    if (!title || !link || !published) return null;
    const parsed = new Date(published);
    if (Number.isNaN(parsed.getTime())) return null;
    const publishedAt = parsed.toISOString();
    const fullText = `${title} ${description}`;
    if (!isTradingRelevant(fullText)) return null;
    const tag = tagFor(fullText);
    const impact = score(fullText, source);
    const dir = direction(fullText);
    const guidance = guidanceFor(tag, dir);
    const ageHours = Math.max(0, (Date.now() - parsed.getTime()) / 3600000);
    const urgency = urgencyFor(impact, publishedAt);
    const priority = Math.max(1, Math.min(20, impact + freshness(publishedAt) + (urgency === "NOW" ? 1.2 : urgency === "WATCH" ? .4 : 0)));
    return {
      title, link, source, publishedAt, impact, priority, tag, direction: dir, urgency, window: windowFor(impact),
      confidence: Math.min(97, 68 + Math.round(impact * 2) + (source === "CoinDesk" ? 7 : source === "Cointelegraph" ? 4 : 2)),
      affected: affected(tag), why: whyFor(tag, dir), whatToDo: guidance.whatToDo, avoid: guidance.avoid, whatToWatch: guidance.watch,
      invalidation: guidance.invalidations[0], regime: regimeFor(tag, dir), bias: biasFor(dir, tag), sharpHeadline: sharpHeadline(tag, dir, title),
      narrative: guidance.narrative, tradableSetup: guidance.setup, finalAction: guidance.final,
      triggerRows: guidance.triggers.map((trigger, i) => ({ watch: guidance.watch[i], trigger, invalidation: guidance.invalidations[i] })),
      bullCase: guidance.bull, bearCase: guidance.bear, ageHours: Math.round(ageHours * 10) / 10,
    };
  }).filter(Boolean) as Array<any>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.has("scheduled_refresh");
  const store = getStore("revedge-intelligence");

  // Normal browser reads consume only the persisted intelligence snapshot.
  // The scheduled pass is the only path that fans out to external RSS feeds.
  if (!forceRefresh) {
    try {
      const intelligence = await store.get("latest-intelligence", { type: "json" });
      if (intelligence) {
        return NextResponse.json(intelligence, {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
            "CDN-Cache-Control": "public, max-age=15, stale-while-revalidate=30",
            "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=30",
          },
        });
      }

      const cached = await store.get("latest-news", { type: "json" });
      if (cached) return NextResponse.json(cached);
    } catch {
      // Bootstrap below if the persistent snapshot is not available yet.
    }
  }

  const responses = await Promise.allSettled(FEEDS.map(async (feed) => {
    const r = await fetch(feed.url, {
      headers: { "User-Agent": "REVEDGE/1.0 (+https://revedge.netlify.app)" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`feed ${feed.name} ${r.status}`);
    return extractItems(await r.text(), feed.name);
  }));
  const stories = responses.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  const unique = new Map<string, any>();
  for (const story of stories) {
    const key = story.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const existing = unique.get(key);
    if (!existing || story.priority > existing.priority) unique.set(key, story);
  }

  const curated = [...unique.values()]
    .filter((story) => story.ageHours < 36 && story.impact >= 7.5)
    .sort((a, b) => (b.priority - a.priority) || (new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()))
    .slice(0, 5);

  const hasNow = curated.some((story) => story.urgency === "NOW");
  const result = {
    stories: curated,
    sources: FEEDS.map((feed) => feed.name),
    updatedAt: new Date().toISOString(),
    mode: hasNow ? "HIGH_ALERT" : "NORMAL",
  };

  if (forceRefresh) {
    try {
      await store.setJSON("latest-news", { ...result, refreshedAt: new Date().toISOString() });
    } catch (error) {
      console.error("REVEDGE snapshot write failed", error);
    }
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
      "CDN-Cache-Control": "public, max-age=15, stale-while-revalidate=30",
      "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=30",
    },
  });
}
