export type RiskFlag = "NONE" | "LIQUIDITY_SWEEP" | "BREAKOUT_TRAP" | "MACRO_HEADWIND" | "EVENT_WHIPSAW";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Bias = "Risk-on" | "Risk-off" | "Neutral";

export type PredictiveLayer = {
  directionScore: number;
  executionScore: number;
  riskFlag: RiskFlag;
  riskLevel: RiskLevel;
  riskLabel: string;
  immediateRead: string;
  baseCase: string;
  riskCase: string;
  worstCase: string;
  confirmation: string[];
  invalidation: string[];
  why: string;
  preEvent: boolean;
  catalystPhase: string;
  scenarioBias: Bias;
  scenarioConfidence: number;
};

type MarketContext = {
  coins?: { symbol: string; change: number }[];
  total3Change?: number;
  macro?: { dxyChange?: number; us10yChange?: number; nasdaqChange?: number; oilChange?: number };
};

type EventLike = {
  tag?: string;
  direction?: Bias;
  bias?: string;
  regime?: string;
  impact?: number;
  confidence?: number;
  sourceCount?: number;
  corroboration?: number;
  urgency?: string;
  tradableSetup?: string;
  triggerRows?: { watch?: string; trigger?: string; invalidation?: string }[];
  scheduled?: boolean;
  eventTime?: number;
  catalystPhase?: string;
  preEventBias?: Bias;
  preEventConfidence?: number;
  scenarios?: { label: string; condition: string; marketPath: string; bias: Bias }[];
};

function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(value))); }
function sign(value: number) { return value > 0 ? 1 : value < 0 ? -1 : 0; }

function marketBias(market?: MarketContext): { bias: Bias; score: number } {
  const btc = market?.coins?.find((c) => c.symbol === "BTC")?.change ?? 0;
  const eth = market?.coins?.find((c) => c.symbol === "ETH")?.change ?? 0;
  const sol = market?.coins?.find((c) => c.symbol === "SOL")?.change ?? 0;
  const breadth = market?.total3Change ?? 0;
  const dxy = market?.macro?.dxyChange ?? 0;
  const yields = market?.macro?.us10yChange ?? 0;
  const nasdaq = market?.macro?.nasdaqChange ?? 0;
  const oil = market?.macro?.oilChange ?? 0;

  // Positive crypto breadth, Nasdaq strength and softer USD/yields support risk-on.
  // Oil is a smaller risk factor because its effect is regime-dependent.
  const raw = btc * 0.34 + eth * 0.16 + sol * 0.14 + breadth * 0.20 + nasdaq * 0.08 - dxy * 0.05 - yields * 0.05 - oil * 0.03;
  const score = clamp(50 + raw * 7, 20, 80);
  return { bias: score >= 57 ? "Risk-on" : score <= 43 ? "Risk-off" : "Neutral", score };
}

function scenarioFor(event: EventLike, market: MarketContext | undefined, current: { bias: Bias; score: number }) {
  const scenarios = Array.isArray(event.scenarios) ? event.scenarios : [];
  const marketDirection = current.bias;
  if (!event.scheduled || event.catalystPhase !== "PRE-EVENT") {
    return { bias: event.direction && event.direction !== "Neutral" ? event.direction : marketDirection, confidence: clamp(Number(event.confidence ?? 60)) };
  }

  // Before a binary catalyst, use current market regime as the prior and the event's
  // scenario map as the conditional path. Do not pretend to know the upcoming print.
  const supportive = scenarios.filter((s) => s.bias === marketDirection).length;
  const prior = marketDirection === "Neutral" ? 50 : 58;
  const confidence = clamp(prior + Math.min(12, supportive * 4) + Math.max(0, Number(event.preEventConfidence ?? 0) - 60) * 0.25, 52, 76);
  return { bias: event.preEventBias && event.preEventBias !== "Neutral" ? event.preEventBias : marketDirection, confidence };
}

export function buildPredictiveLayer(event: EventLike, market?: MarketContext, nextCatalyst?: EventLike): PredictiveLayer {
  const impact = Number(event.impact ?? 0);
  const current = marketBias(market);
  const scenario = scenarioFor(event, market, current);
  const direction = scenario.bias;
  const preEvent = event.scheduled === true && event.catalystPhase === "PRE-EVENT";
  const hoursToEvent = event.eventTime ? (event.eventTime - Date.now()) / 3600000 : Infinity;
  const eventRisk = impact >= 8 || (nextCatalyst?.scheduled && Number(nextCatalyst.impact ?? 0) >= 8);

  let directionScore = current.score;
  if (direction === "Risk-on") directionScore = Math.max(directionScore, 58);
  if (direction === "Risk-off") directionScore = Math.min(directionScore, 42);
  if (preEvent) directionScore = directionScore * 0.72 + (direction === "Risk-on" ? 68 : direction === "Risk-off" ? 32 : 50) * 0.28;
  directionScore = clamp(directionScore, direction === "Neutral" ? 35 : 20, direction === "Neutral" ? 65 : 85);

  let riskFlag: RiskFlag = "NONE";
  let riskLevel: RiskLevel = "LOW";
  if (eventRisk && (preEvent || Math.abs(current.score - 50) < 9)) { riskFlag = "EVENT_WHIPSAW"; riskLevel = "HIGH"; }
  else if (Math.abs(current.score - 50) >= 18 && Math.abs((market?.total3Change ?? 0) - (market?.coins?.find((c) => c.symbol === "BTC")?.change ?? 0)) >= 2) { riskFlag = "LIQUIDITY_SWEEP"; riskLevel = "HIGH"; }
  else if (event.tag === "MACRO" && (market?.macro?.dxyChange ?? 0) > 0.35 && direction === "Risk-on") { riskFlag = "MACRO_HEADWIND"; riskLevel = "MEDIUM"; }
  else if (direction !== "Neutral") { riskFlag = "BREAKOUT_TRAP"; riskLevel = "MEDIUM"; }

  const executionScore = clamp(
    88 - (riskLevel === "HIGH" ? 30 : riskLevel === "MEDIUM" ? 16 : 5) - (preEvent ? 8 : 0) + (Math.abs(current.score - 50) >= 12 ? 5 : 0),
    35,
    90,
  );

  const riskLabel = {
    NONE: "No dominant execution risk",
    LIQUIDITY_SWEEP: "Liquidity sweep risk before continuation",
    BREAKOUT_TRAP: "Breakout trap / failed continuation risk",
    MACRO_HEADWIND: "Macro pressure against the current bias",
    EVENT_WHIPSAW: "Whipsaw risk around the catalyst",
  }[riskFlag];

  const baseCase = preEvent
    ? direction === "Risk-on"
      ? "Current risk-on structure persists into the catalyst; softer or in-line data keeps the upside path alive."
      : direction === "Risk-off"
        ? "Current risk-off structure persists into the catalyst; a hotter or hawkish outcome extends downside pressure."
        : "Market enters the catalyst without a clean directional edge; the first confirmed reaction matters more than the headline."
    : direction === "Risk-on"
      ? "BTC holds strength → ETH/SOL confirm → breadth expands."
      : direction === "Risk-off"
        ? "BTC stays weak → ETH/SOL lag → downside spreads into alts."
        : "BTC remains two-way until price and breadth align.";

  const riskCase = preEvent
    ? "The event produces a surprise against the current positioning, forcing a fast repricing before a second move."
    : riskFlag === "LIQUIDITY_SWEEP"
      ? "Liquidity is swept first, then price attempts to reclaim the main direction."
      : direction === "Risk-on"
        ? "Breakout fails to gain follow-through and breadth contracts."
        : direction === "Risk-off"
          ? "BTC squeezes higher after the flush; late shorts are vulnerable."
          : "The first reaction fades without sustained follow-through.";

  const worstCase = direction === "Risk-on"
    ? "BTC loses the key level → long liquidation → ETH/SOL weaken → breadth contracts."
    : direction === "Risk-off"
      ? "BTC loses support → deleveraging expands → alt weakness accelerates."
      : "Two-way volatility increases without a clean edge.";

  const rows = Array.isArray(event.triggerRows) ? event.triggerRows : [];
  const confirmation = rows.map((r) => r.trigger).filter(Boolean).slice(0, 3) as string[];
  const invalidation = rows.map((r) => r.invalidation).filter(Boolean).slice(0, 3) as string[];
  if (!confirmation.length) {
    confirmation.push("BTC holds the catalyst level", "ETH / SOL confirm the move", "TOTAL3 breadth expands with price");
  }
  if (!invalidation.length) {
    invalidation.push("BTC loses the key level", "ETH / SOL lag after the first reaction", "TOTAL3 breadth contracts");
  }

  const immediateRead = preEvent
    ? direction === "Risk-on" ? "BULLISH BIAS — ENTRY NOT YET SAFE" : direction === "Risk-off" ? "BEARISH BIAS — WAIT FOR REACTION" : "NO EDGE — WAIT FOR THE CATALYST"
    : direction === "Risk-on" ? (riskLevel === "HIGH" ? "BULLISH, BUT ENTRY NOT YET SAFE" : "CONFIRMATION REQUIRED")
      : direction === "Risk-off" ? "BEARISH, BUT WAIT FOR REACTION" : "NO EDGE — WAIT";

  return {
    directionScore,
    executionScore,
    riskFlag,
    riskLevel,
    riskLabel,
    immediateRead,
    baseCase,
    riskCase,
    worstCase,
    confirmation,
    invalidation,
    why: event.tradableSetup || (preEvent ? "Pre-event bias is probabilistic. Actual price reaction must confirm or invalidate it." : "Price + breadth decide whether the directional bias becomes tradable."),
    preEvent,
    catalystPhase: event.catalystPhase ?? "POST-EVENT",
    scenarioBias: direction,
    scenarioConfidence: scenario.confidence,
  };
}
