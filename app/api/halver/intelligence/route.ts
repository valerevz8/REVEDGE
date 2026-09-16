import { NextResponse } from "next/server";

type Candle = [number, string, string, string, string, string, number, string, number, string, string, string];
type Market = {
  coins: Array<{ symbol: string; price: number; change: number }>;
  total3Change: number;
  goldChange?: number;
  crossAsset?: {
    dxy?: { value: number | null; changePct: number };
    yields10y?: { value: number | null; changePct: number };
    nasdaq?: { value: number | null; changePct: number };
  };
};

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function scoreSigned(n: number, scale: number) { return clamp(50 + (n / scale) * 50, 0, 100); }
function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
async function candles(symbol: string, interval = "15m", limit = 96): Promise<Candle[]> {
  const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { next: { revalidate: 15 }, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Binance ${symbol} unavailable`);
  return response.json();
}
function liquidity(c: Candle[]) {
  const highs = c.map((x) => Number(x[2]));
  const lows = c.map((x) => Number(x[3]));
  const close = Number(c.at(-1)?.[4] ?? 0);
  const high = Math.max(...highs.slice(0, -1));
  const low = Math.min(...lows.slice(0, -1));
  const recentHighs = highs.slice(-32);
  const recentLows = lows.slice(-32);
  const highClusters = recentHighs.filter((h) => Math.abs(h - high) / high < 0.0015).length;
  const lowClusters = recentLows.filter((l) => Math.abs(l - low) / low < 0.0015).length;
  const range = Math.max(1, high - low);
  const upperDistance = ((high - close) / range) * 100;
  const lowerDistance = ((close - low) / range) * 100;
  const buyStops = clamp(45 + highClusters * 10 + Math.max(0, 20 - upperDistance));
  const sellStops = clamp(45 + lowClusters * 10 + Math.max(0, 20 - lowerDistance));
  return { buyStops, sellStops, imbalance: Math.abs(buyStops - sellStops), high, low, close, highClusters, lowClusters };
}
function structure(c: Candle[]) {
  const closes = c.map((x) => Number(x[4]));
  const fast = median(closes.slice(-8));
  const slow = median(closes.slice(-32));
  const trend = slow ? ((fast - slow) / slow) * 100 : 0;
  const recentHigh = Math.max(...c.slice(-16).map((x) => Number(x[2])));
  const recentLow = Math.min(...c.slice(-16).map((x) => Number(x[3])));
  const last = closes.at(-1) ?? 0;
  const position = recentHigh === recentLow ? 50 : ((last - recentLow) / (recentHigh - recentLow)) * 100;
  return { trend, position, recentHigh, recentLow };
}
function flowScore(c: Candle[]) {
  const recent = c.slice(-8).reduce((sum, x) => sum + (2 * Number(x[9]) - Number(x[5])), 0);
  const baseline = c.slice(-32, -8).reduce((sum, x) => sum + (2 * Number(x[9]) - Number(x[5])), 0);
  if (!Number.isFinite(recent) || !Number.isFinite(baseline)) return 50;
  const scale = Math.max(1, Math.abs(baseline) / 3);
  return scoreSigned(recent / scale, 1);
}
function crossAssetScore(m: Market) {
  const btc = m.coins.find((x) => x.symbol === "BTC")?.change ?? 0;
  const eth = m.coins.find((x) => x.symbol === "ETH")?.change ?? 0;
  const sol = m.coins.find((x) => x.symbol === "SOL")?.change ?? 0;
  const total3 = m.total3Change ?? 0;
  const dxy = m.crossAsset?.dxy?.changePct ?? 0;
  const yields = m.crossAsset?.yields10y?.changePct ?? 0;
  const nasdaq = m.crossAsset?.nasdaq?.changePct ?? 0;
  const macro = (nasdaq - dxy - yields) / 3;
  const crypto = (eth + sol + total3) / 3;
  return { score: scoreSigned((macro + crypto + btc) / 3, 3), btc, eth, sol, total3, dxy, yields, nasdaq };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const eventMs = Number(url.searchParams.get("eventMs") ?? 0);
    const [marketResponse, btc] = await Promise.all([
      fetch(new URL("/api/market", url), { cache: "no-store" }),
      candles("BTCUSDT"),
    ]);
    if (!marketResponse.ok) throw new Error("Market snapshot unavailable");
    const market = (await marketResponse.json()) as Market;
    const lq = liquidity(btc);
    const st = structure(btc);
    const flow = flowScore(btc);
    const cross = crossAssetScore(market);
    const btc24 = cross.btc;
    const breadth = cross.total3;

    const marketStructure = scoreSigned(st.trend, 1.2);
    const liquidityScore = clamp(100 - lq.imbalance * 0.9);
    const macroScore = scoreSigned((cross.nasdaq - cross.dxy - cross.yields) / 3, 1.5);
    const breadthScore = scoreSigned(breadth, 2.5);
    const cryptoAlignment = scoreSigned((cross.eth + cross.sol + btc24) / 3, 2.5);
    const catalystScore = eventMs > 0 ? (Date.now() < eventMs ? 78 : 86) : 55;
    const components = [
      { name: "Macro Catalyst", score: catalystScore, weight: 25 },
      { name: "Market Structure", score: marketStructure, weight: 20 },
      { name: "Liquidity", score: liquidityScore, weight: 15 },
      { name: "Volume / Flow", score: flow, weight: 15 },
      { name: "Cross Asset Confirmation", score: cross.score, weight: 15 },
      { name: "Market Breadth", score: breadthScore, weight: 10 },
    ];
    const vexScore = Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / 100);
    const directional = macroScore * 0.25 + marketStructure * 0.2 + cryptoAlignment * 0.2 + breadthScore * 0.15 + cross.score * 0.2;
    const biasScore = Math.round((directional - 50) * 2);
    const bias = biasScore >= 12 ? "BULLISH" : biasScore <= -12 ? "BEARISH" : "NEUTRAL";

    const checklist = [
      { label: "Macro catalyst defined", ok: eventMs > 0 },
      { label: "Liquidity sweep / probe identified", ok: lq.imbalance >= 10 },
      { label: "Structure aligned", ok: Math.abs(st.trend) >= 0.12 },
      { label: "Volume / flow expansion", ok: flow >= 58 },
      { label: "BTC + ETH/SOL aligned", ok: Math.sign(btc24) === Math.sign(cross.eth) && Math.sign(btc24) === Math.sign(cross.sol) },
      { label: "TOTAL3 breadth confirms", ok: Math.sign(btc24) === Math.sign(breadth) && Math.abs(breadth) >= 0.25 },
      { label: "Macro + price aligned", ok: Math.sign(btc24) === Math.sign(cross.nasdaq - cross.dxy - cross.yields) },
      { label: "Breakout acceptance", ok: st.position > 68 || st.position < 32 },
      { label: "Tradeability threshold", ok: vexScore >= 70 },
    ];

    const tradeability = Math.round(clamp(vexScore * 0.55 + cross.score * 0.2 + flow * 0.15 + breadthScore * 0.1));
    const reversalRisk = lq.imbalance >= 30 || (Math.abs(st.trend) < 0.15 && vexScore < 65) ? "HIGH" : lq.imbalance >= 18 ? "MEDIUM" : "LOW";
    const decision = bias === "BULLISH" ? "LONG" : bias === "BEARISH" ? "SHORT" : "WAIT";
    const phase = eventMs && Date.now() < eventMs ? "PRE_EVENT" : "POST_EVENT";

    const scenarioBase = clamp(35 + (100 - vexScore) * 0.2 + lq.imbalance * 0.25);
    const bullish = clamp(Math.round(50 + biasScore * 0.45));
    const bearish = 100 - bullish;
    const whipsaw = clamp(Math.round(scenarioBase));
    const scenarioBull = clamp(Math.round((bullish + (100 - whipsaw) * 0.35) / 1.35));
    const scenarioBear = clamp(100 - whipsaw - scenarioBull);
    const reactionLabel = lq.buyStops > lq.sellStops ? "Upside liquidity is denser; a sweep before continuation is possible." : lq.sellStops > lq.buyStops ? "Downside liquidity is denser; a downside probe is possible." : "Liquidity is balanced; wait for the event to reveal the side of acceptance.";
    const transmission = `${cross.dxy >= 0 ? "DXY firm" : "DXY soft"} · ${cross.yields >= 0 ? "yields firm" : "yields ease"} · ${cross.nasdaq >= 0 ? "Nasdaq supportive" : "Nasdaq weak"} · ETH ${cross.eth >= 0 ? "up" : "down"} · SOL ${cross.sol >= 0 ? "up" : "down"}`;

    return NextResponse.json({
      ok: true,
      observedAt: new Date().toISOString(),
      vex: { score: vexScore, state: vexScore >= 75 ? "TRADEABLE" : vexScore >= 60 ? "WATCH" : "NO EDGE", direction: bias, components },
      bias: { bias, score: biasScore, bullishProbability: bullish, bearishProbability: bearish },
      scenarios: [
        { id: "BULLISH_ACCEPTANCE", label: "Bullish Acceptance", probability: scenarioBull, note: "Event response holds above the catalyst level and breadth expands." },
        { id: "WHIPSAW", label: "Whipsaw / Fake Move", probability: whipsaw, note: "Initial breakout fails to gain acceptance and liquidity is probed." },
        { id: "BEARISH_CONTINUATION", label: "Bearish Continuation", probability: scenarioBear, note: "Support fails with cross-asset confirmation and breadth contracts." },
      ],
      liquidity: { buyStops: Math.round(lq.buyStops), sellStops: Math.round(lq.sellStops), imbalance: Math.round(lq.imbalance), buySideLevel: lq.high, sellSideLevel: lq.low, highClusters: lq.highClusters, lowClusters: lq.lowClusters, sweepRisk: reversalRisk },
      market: { btc: btc24, eth: cross.eth, sol: cross.sol, total3: breadth, dxy: cross.dxy, yields10y: cross.yields, nasdaq: cross.nasdaq, gold: market.goldChange ?? 0 },
      checklist,
      decision: { phase, decision, tradeability, reversalRisk, thesisStatus: phase === "PRE_EVENT" ? "PENDING" : "VALIDATING", trigger: reactionLabel, invalidation: bias === "BULLISH" ? "BTC loses the pre-event structure with cross-asset confirmation." : bias === "BEARISH" ? "BTC reclaims the pre-event structure with cross-asset confirmation." : "Price and cross-asset signals remain misaligned.", transmissionRead: transmission },
      structure: { trendPct: st.trend, positionPct: st.position, recentHigh: st.recentHigh, recentLow: st.recentLow },
      reaction: { initial: "WICK ≠ ACCEPTANCE", note: "A spike is only an initial reaction. HALVER waits for the level to hold and for cross-asset transmission to confirm." },
      sources: { candles: "Binance public market data", market: "HALVER /api/market", flow: "Binance taker-buy volume proxy" },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "HALVER intelligence temporarily unavailable" }, { status: 503 });
  }
}
