import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";

// HALVER is decision-first: only surface fresh events with a credible, market-moving
// mechanism. Generic commentary and low-impact headlines are intentionally excluded.
const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
  { name: "Google News · Crypto Catalysts", url: "https://news.google.com/rss/search?q=bitcoin%20crypto%20ETF%20SEC%20CFTC%20liquidation%20hack%20exploit%20inflow%20outflow%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
  { name: "Google News · Macro Catalysts", url: "https://news.google.com/rss/search?q=CPI%20PCE%20PPI%20FOMC%20Fed%20rate%20Treasury%20yields%20bitcoin%20crypto%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
  { name: "Google News · Market Shock", url: "https://news.google.com/rss/search?q=bitcoin%20liquidation%20hack%20exploit%20depeg%20bankruptcy%20crash%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen" },
];

const MIN_IMPACT = 7.0;
const MAX_AGE_HOURS = 36;

function clean(v: string) {
  return v
    .replace(/<!\[CDATA\[|\]\]>/gi, "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<a\b[\s\S]*?(?:>|$)/gi, " ")
    .replace(/<\/a>/gi, " ")
    .replace(/\bhref\s*=\s*["'][^"']*["']/gi, " ")
    .replace(/https?:\/\/[^\s"'<>]+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagFor(text: string) {
  const x = text.toLowerCase();
  if (/bitcoin|\bbtc\b|spot bitcoin etf|bitcoin etf/.test(x)) return "BTC";
  if (/ethereum|\beth\b|ethereum etf/.test(x)) return "ETH";
  if (/solana|\bsol\b/.test(x)) return "SOL";
  if (/meme|doge|shib|pepe|bonk|wif/.test(x)) return "MEME";
  if (/stablecoin|defi|dex|lending|on-chain|depeg/.test(x)) return "DEFI";
  if (/sec|cftc|congress|regulation|legislation|approval|approved|ban|lawsuit|court/.test(x)) return "REGULATION";
  if (/fed|fomc|inflation|cpi|pce|ppi|rate|treasury|yield|dollar|liquidity|jobs report|payroll/.test(x)) return "MACRO";
  return "CRYPTO";
}

function hasCrypto(x: string) {
  return /bitcoin|\bbtc\b|ethereum|\beth\b|solana|\bsol\b|crypto|stablecoin|defi|digital asset|altcoin|spot bitcoin etf|ethereum etf/.test(x);
}

function hasHardCatalyst(x: string) {
  return /etf|sec|cftc|approval|approved|regulation|lawsuit|liquidation|liquidations|hack|exploit|outflow|inflow|institutional|tariff|sanction|war|emergency|collapse|crash|depeg|bankruptcy|exchange failure/.test(x);
}

function hasMajorMacro(x: string) {
  return /\b(cpi|core cpi|pce|core pce|ppi|fomc|fed|fed funds|rate decision|rate cut|rate hike|nonfarm payrolls|nfp|payrolls)\b/.test(x);
}

function hasPriceShock(x: string) {
  const move = /(bitcoin|btc|ethereum|eth|solana|sol|crypto).{0,180}(surge|soar|rally|sell-off|selloff|crash|collapse|breakout|breaks above|breaks below|record|all-time high|liquidation|rejected|rejects|support|resistance|plunge|slump)/.test(x);
  const magnitude = /\d+(?:\.\d+)?\s*%|billion|million|\$[0-9]/.test(x);
  return move && magnitude;
}

function isTradingRelevant(text: string) {
  const x = text.toLowerCase();
  const fluff = /podcast|interview|opinion|price prediction|weekly roundup|best crypto|top crypto to buy|could reach|will reach|sponsored|casino|analyst says|expert predicts/.test(x);
  if (fluff) return false;

  const crypto = hasCrypto(x);
  const hardCatalyst = hasHardCatalyst(x);
  const macro = hasMajorMacro(x);
  const priceShock = hasPriceShock(x);

  // A crypto story needs a concrete catalyst or measurable market shock.
  if (crypto && (hardCatalyst || priceShock)) return true;

  // Macro is allowed only when it is an actual policy/inflation/labor catalyst and
  // has a plausible crypto transmission path; generic stock-market commentary is out.
  if (macro && (crypto || /treasury|yield|dollar|liquidity|oil/.test(x))) return true;

  return false;
}

function score(text: string, source: string) {
  const x = text.toLowerCase();
  let v = 5.0;
  const systemic = /hack|exploit|stablecoin depeg|bankruptcy|exchange failure|war|sanction|emergency|collapse/.test(x);
  const catalyst = /etf|sec|cftc|approval|approved|lawsuit|liquidation|liquidations|outflow|inflow|institutional|tariff|treasury|liquidity|fomc|fed|cpi|pce|ppi|rate decision|nfp/.test(x);
  const priceShock = hasPriceShock(x);
  const magnitude = /\d+(?:\.\d+)?\s*%|billion|million|\$[0-9]/.test(x);

  if (systemic) v += 2.2;
  if (catalyst) v += 1.3;
  if (priceShock) v += 1.0;
  if (magnitude) v += 0.6;
  if (/breaking|just in|urgent|now|minutes ago|hours ago/.test(x)) v += 0.4;
  if (source === "CoinDesk") v += 0.3;
  if (source === "Cointelegraph") v += 0.2;

  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function direction(text: string): "Risk-on" | "Risk-off" | "Neutral" {
  const x = text.toLowerCase();
  if (/hack|exploit|ban|lawsuit|liquidation|crash|collapse|sanction|outflow|sell-off|selloff|selling|hawkish|depeg|hotter inflation|oil above|oil surge|geopolitical escalation|war|plunge|slump/.test(x)) return "Risk-off";
  if (/approval|approved|inflow|surge|rally|adoption|launch|partnership|record|buying|bullish|dovish|lower yields|oil falls|ceasefire/.test(x)) return "Risk-on";
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
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours <= 1) return 3;
  if (hours <= 3) return 2.2;
  if (hours <= 6) return 1.2;
  if (hours <= 12) return 0.2;
  if (hours <= 24) return -0.8;
  return -2;
}

function urgencyFor(impact: number, iso: string): "NOW" | "WATCH" | "FADING" {
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (impact >= 8 && hours < 3) return "NOW";
  if (hours < 12 && impact >= 7.5) return "WATCH";
  return "FADING";
}

function regimeFor(d: string) {
  if (d === "Risk-off") return "Cautious";
  if (d === "Risk-on") return "Risk-On";
  return "Mixed";
}

function biasFor(d: string, tag: string) {
  if (d === "Risk-off") return "Bearish";
  if (d === "Risk-on") return "Bullish";
  return tag === "MACRO" ? "Neutral" : "Wait for confirmation";
}

function whyFor(tag: string, d: string) {
  if (tag === "MACRO") return d === "Risk-off"
    ? ["The catalyst can reprice liquidity and rate expectations across crypto.", "The bearish signal matters most when BTC is extended or loses a key level.", "Price reaction after the first volatility burst matters more than the headline."]
    : ["The catalyst can reprice liquidity and rate expectations across crypto.", "BTC is the first confirmation layer; alts matter after BTC absorbs the event.", "The trade is the reaction, not the headline itself."];
  if (tag === "BTC") return ["BTC is the primary market driver and can transmit the catalyst into ETH, SOL and alts.", "A headline without price confirmation is information, not a setup.", "Follow-through and breadth decide whether the move is real."];
  if (tag === "ETH") return ["ETH is a key confirmation layer for alt participation.", "Strength that fails to spread into SOL / broader breadth is weak rotation.", "The setup improves only when relative strength survives the first reaction."];
  return ["This catalyst can move risk appetite beyond the directly affected asset.", "High-beta names amplify both upside and downside when liquidity shifts.", "Price and breadth confirmation determine whether it becomes actionable."];
}

function guidanceFor(d: string) {
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
  return blocks.slice(0, 40).map((block) => {
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
    if (impact < MIN_IMPACT) return null;

    const dir = direction(fullText);
    const guidance = guidanceFor(dir);
    const ageHours = Math.max(0, (Date.now() - parsed.getTime()) / 3600000);
    if (ageHours >= MAX_AGE_HOURS) return null;

    const urgency = urgencyFor(impact, publishedAt);
    const priority = Math.max(1, Math.min(20, impact + freshness(publishedAt) + (urgency === "NOW" ? 1.2 : urgency === "WATCH" ? 0.4 : 0)));
    const summary = description
      ? description.slice(0, 420)
      : `Live ${tag} catalyst from ${source}. Price reaction and breadth determine whether the headline becomes a trade.`;
    const why = whyFor(tag, dir);
    why[0] = summary;

    return {
      title, link, source, publishedAt, impact, priority, tag, direction: dir, urgency,
      window: windowFor(impact),
      confidence: Math.min(97, 68 + Math.round(impact * 2) + (source === "CoinDesk" ? 7 : source === "Cointelegraph" ? 4 : 2)),
      affected: affected(tag), why, whatToDo: guidance.whatToDo, avoid: guidance.avoid,
      whatToWatch: guidance.watch, invalidation: guidance.invalidations[0],
      regime: regimeFor(dir), bias: biasFor(dir, tag),
      sharpHeadline: title.replace(/\s+/g, " ").trim(),
      narrative: guidance.narrative, tradableSetup: guidance.setup, finalAction: guidance.final,
      triggerRows: guidance.triggers.map((trigger, i) => ({ watch: guidance.watch[i], trigger, invalidation: guidance.invalidations[i] })),
      bullCase: guidance.bull, bearCase: guidance.bear,
      ageHours: Math.round(ageHours * 10) / 10,
    };
  }).filter(Boolean) as Array<any>;
}

async function buildMarketStory() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&per_page=3&page=1&price_change_percentage=24h", { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const coins = await response.json();
    const btc = coins.find((c: any) => c.id === "bitcoin");
    const eth = coins.find((c: any) => c.id === "ethereum");
    const sol = coins.find((c: any) => c.id === "solana");
    if (!btc || !eth || !sol) return null;

    const btcCh = Number(btc.price_change_percentage_24h ?? 0);
    const ethCh = Number(eth.price_change_percentage_24h ?? 0);
    const solCh = Number(sol.price_change_percentage_24h ?? 0);
    const spread = Math.max(Math.abs(btcCh - ethCh), Math.abs(btcCh - solCh));
    if (!(Math.abs(btcCh) >= 1.1 || spread >= 2.0)) return null;

    const riskOff = btcCh < -1.1 || (btcCh < 0 && (ethCh < btcCh - 1 || solCh < btcCh - 1));
    const riskOn = btcCh > 1.1 && ethCh > 0 && solCh > 0;
    const dir: "Risk-on" | "Risk-off" | "Neutral" = riskOff ? "Risk-off" : riskOn ? "Risk-on" : "Neutral";
    const impact = Math.min(9.6, Math.max(7.0, 7.0 + Math.abs(btcCh) * 0.75 + spread * 0.35));
    const publishedAt = new Date().toISOString();
    const price = Number(btc.current_price ?? 0);
    const title = riskOff
      ? `BTC ${price.toLocaleString("en-US", { maximumFractionDigits: 0 })} under pressure as ETH/SOL lag ${btcCh.toFixed(1)}% 24h`
      : riskOn
        ? `BTC ${price.toLocaleString("en-US", { maximumFractionDigits: 0 })} leads a broad crypto rebound at ${btcCh.toFixed(1)}% 24h`
        : `BTC ${price.toLocaleString("en-US", { maximumFractionDigits: 0 })} diverges from ETH/SOL as crypto breadth thins`;
    const summary = `Live market structure: BTC ${btcCh >= 0 ? "+" : ""}${btcCh.toFixed(1)}%, ETH ${ethCh >= 0 ? "+" : ""}${ethCh.toFixed(1)}%, SOL ${solCh >= 0 ? "+" : ""}${solCh.toFixed(1)}% over 24h. This is a chart-derived alert; no external headline is required.`;
    const guidance = guidanceFor(dir);

    return {
      title, link: "", source: "Live Market Structure", publishedAt, impact, priority: impact + 2.5,
      tag: "BTC", direction: dir, urgency: "NOW" as const, window: windowFor(impact), confidence: 82,
      affected: ["BTC", "ETH", "SOL", "ALT"], why: [summary, ...whyFor("BTC", dir).slice(1)],
      whatToDo: guidance.whatToDo, avoid: guidance.avoid, whatToWatch: guidance.watch,
      invalidation: guidance.invalidations[0], regime: regimeFor(dir), bias: biasFor(dir, "BTC"),
      sharpHeadline: title, narrative: guidance.narrative, tradableSetup: guidance.setup,
      finalAction: guidance.final,
      triggerRows: guidance.triggers.map((trigger, i) => ({ watch: guidance.watch[i], trigger, invalidation: guidance.invalidations[i] })),
      bullCase: guidance.bull, bearCase: guidance.bear, ageHours: 0,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.has("scheduled_refresh");
  const store = getStore("revedge-intelligence");

  const sanitizeSnapshot = (snapshot: any) => ({
    ...snapshot,
    stories: Array.isArray(snapshot?.stories)
      ? snapshot.stories.filter((story: any) => Number(story?.impact ?? 0) >= MIN_IMPACT && Number(story?.ageHours ?? 0) < MAX_AGE_HOURS).slice(0, 5)
      : [],
  });

  if (!forceRefresh) {
    try {
      const intelligence = await store.get("latest-intelligence", { type: "json" });
      if (intelligence) return NextResponse.json(sanitizeSnapshot(intelligence), {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30", "CDN-Cache-Control": "public, max-age=15, stale-while-revalidate=30", "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=30" }
      });
      const cached = await store.get("latest-news", { type: "json" });
      if (cached) return NextResponse.json(sanitizeSnapshot(cached));
    } catch {
      // Bootstrap below if the persistent snapshot is not available yet.
    }
  }

  const responses = await Promise.allSettled(FEEDS.map(async (feed) => {
    const r = await fetch(feed.url, { headers: { "User-Agent": "HALVER/1.0" }, cache: "no-store" });
    if (!r.ok) throw new Error(`feed ${feed.name} ${r.status}`);
    return extractItems(await r.text(), feed.name);
  }));

  const stories = responses.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  const marketStory = await buildMarketStory();
  if (marketStory) stories.push(marketStory);

  const unique = new Map<string, any>();
  for (const story of stories) {
    const key = story.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const existing = unique.get(key);
    if (!existing || story.priority > existing.priority) unique.set(key, story);
  }

  const curated = [...unique.values()]
    .filter((story) => story.ageHours < MAX_AGE_HOURS && story.impact >= MIN_IMPACT)
    .sort((a, b) => (b.priority - a.priority) || (new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()))
    .slice(0, 5);

  const hasNow = curated.some((story) => story.urgency === "NOW");
  const result = {
    stories: curated,
    sources: FEEDS.map((feed) => feed.name).concat("Live Market Structure"),
    updatedAt: new Date().toISOString(),
    mode: hasNow ? "HIGH_ALERT" : "NORMAL",
  };

  if (forceRefresh) {
    try {
      await store.setJSON("latest-news", { ...result, refreshedAt: new Date().toISOString() });
    } catch (error) {
      console.error("HALVER snapshot write failed", error);
    }
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30", "CDN-Cache-Control": "public, max-age=15, stale-while-revalidate=30", "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=30" }
  });
}
