export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
export type Decision = "LONG" | "SHORT" | "WAIT" | "NO_TRADE" | "REVERSAL_WATCH";
export type ReactionState = "UNRESOLVED" | "ACCEPTED" | "REJECTED" | "FAILED";
export type ThesisStatus = "PENDING" | "VALIDATED" | "WEAKENED" | "INVALIDATED";
export type Phase = "PRE_EVENT" | "INITIAL_REACTION" | "ACCEPTANCE" | "TRANSMISSION";

export interface CrossAsset {
  dxy: number;
  yields: number;
  nasdaq: number;
  eth: number;
  sol: number;
  total3: number;
}

export interface HalverInput {
  market: {
    regime: number;
    expectations: number;
    positioning: number;
    policyPressure: number;
    surprise: number;
    transmission: number;
    btcStructure: number;
  };
  reaction?: {
    initialMove: number;
    retracement: number;
    reactionLevelHeld: boolean;
    preEventLevelHeld: boolean;
    followThrough: number;
    volume: number;
    oiPositioning: number;
    crossAsset: CrossAsset;
  };
  dataQuality?: number;
}

export interface HalverDecision {
  phase: Phase;
  biasScore: number;
  bias: Direction;
  bullishProbability: number;
  bearishProbability: number;
  reactionDirection: Direction;
  reactionState: ReactionState;
  reactionQuality: number | null;
  thesisStatus: ThesisStatus;
  tradeability: number | null;
  decision: Decision;
  reversalRisk: "LOW" | "MEDIUM" | "HIGH";
  setupType: "DIRECTIONAL" | "BREAKOUT" | "REVERSAL" | "NO_EDGE";
  edgeQuality: "STRONG" | "MODERATE" | "WEAK";
  trigger: string;
  invalidation: string;
  reactionRead: string;
  transmissionRead: string;
  warnings: string[];
  rationale: string[];
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round = (n: number) => Math.round(n);
const signDirection = (score: number): Direction => score >= 40 ? "BULLISH" : score <= -40 ? "BEARISH" : "NEUTRAL";

type Reaction = NonNullable<HalverInput["reaction"]>;

export function calculateBias(input: HalverInput["market"], dataQuality = 1) {
  const weights = {
    regime: 15,
    expectations: 15,
    positioning: 15,
    policyPressure: 15,
    surprise: 15,
    transmission: 15,
    btcStructure: 10,
  } as const;

  // Policy pressure is inverted for risk assets: hawkish pressure is a bearish BTC input.
  const raw =
    input.regime * weights.regime +
    input.expectations * weights.expectations +
    input.positioning * weights.positioning -
    input.policyPressure * weights.policyPressure +
    input.surprise * weights.surprise +
    input.transmission * weights.transmission +
    input.btcStructure * weights.btcStructure;

  const score = clamp(raw * clamp(dataQuality, 0, 1), -100, 100);
  const bullish = clamp(50 + score / 2, 0, 100);
  return {
    score: round(score),
    direction: signDirection(score),
    bullishProbability: round(bullish),
    bearishProbability: round(100 - bullish),
  };
}

function getInitialDirection(initialMove: number): Direction {
  if (initialMove >= 0.3) return "BULLISH";
  if (initialMove <= -0.3) return "BEARISH";
  return "NEUTRAL";
}

function confirmationScore(direction: Direction, cross: CrossAsset) {
  if (direction === "NEUTRAL") return 0;
  const values = [cross.dxy, cross.yields, cross.nasdaq, cross.eth, cross.sol, cross.total3];
  return values.filter((v) => direction === "BULLISH" ? v >= 0.35 : v <= -0.35).length;
}

function reactionQuality(reaction: Reaction, direction: Direction, state: ReactionState) {
  if (direction === "NEUTRAL") return 0;
  const acceptance = state === "ACCEPTED" ? 100 : state === "REJECTED" ? 20 : state === "FAILED" ? 0 : 50;
  const cross = confirmationScore(direction, reaction.crossAsset);
  const macro = direction === "BULLISH"
    ? ((reaction.crossAsset.dxy + reaction.crossAsset.yields + reaction.crossAsset.nasdaq) / 3 + 1) * 50
    : ((-reaction.crossAsset.dxy - reaction.crossAsset.yields - reaction.crossAsset.nasdaq) / 3 + 1) * 50;
  const crossScore = (cross / 6) * 100;
  const volume = clamp(reaction.volume, 0, 1) * 100;
  const oi = direction === "BULLISH"
    ? clamp((reaction.oiPositioning + 1) / 2, 0, 1) * 100
    : clamp((-reaction.oiPositioning + 1) / 2, 0, 1) * 100;
  const follow = direction === "BULLISH"
    ? clamp((reaction.followThrough + 1) / 2, 0, 1) * 100
    : clamp((-reaction.followThrough + 1) / 2, 0, 1) * 100;

  return round(clamp(
    acceptance * 0.30 + clamp(macro, 0, 100) * 0.20 + crossScore * 0.20 + volume * 0.10 + oi * 0.10 + follow * 0.10,
    0,
    100,
  ));
}

function edgeQuality(score: number): HalverDecision["edgeQuality"] {
  const magnitude = Math.abs(score);
  return magnitude >= 65 ? "STRONG" : magnitude >= 40 ? "MODERATE" : "WEAK";
}

export function evaluateHalver(input: HalverInput): HalverDecision {
  const dataQuality = clamp(input.dataQuality ?? 1, 0, 1);
  const bias = calculateBias(input.market, dataQuality);
  const warnings: string[] = [];
  const rationale: string[] = [];
  const quality = edgeQuality(bias.score);

  if (!input.reaction) {
    const directional = bias.direction !== "NEUTRAL";
    if (directional) warnings.push("Pre-event directional edge detected, but price confirmation is still required.");
    else warnings.push("Directional edge is weak.");
    if (dataQuality < 0.8) warnings.push("Partial data: confirmation confidence reduced.");
    rationale.push(`Pre-event ${bias.direction.toLowerCase()} bias with ${bias.bullishProbability}% bullish reaction probability.`);
    rationale.push(`Edge quality: ${quality.toLowerCase()}.`);
    return {
      phase: "PRE_EVENT",
      biasScore: bias.score,
      bias: bias.direction,
      bullishProbability: bias.bullishProbability,
      bearishProbability: bias.bearishProbability,
      reactionDirection: "NEUTRAL",
      reactionState: "UNRESOLVED",
      reactionQuality: null,
      thesisStatus: "PENDING",
      tradeability: null,
      decision: directional ? (bias.direction === "BULLISH" ? "LONG" : "SHORT") : "WAIT",
      reversalRisk: "LOW",
      setupType: directional ? "DIRECTIONAL" : "NO_EDGE",
      edgeQuality: quality,
      trigger: bias.direction === "BULLISH" ? "BTC reclaims and holds the catalyst level with cross-asset confirmation." : bias.direction === "BEARISH" ? "BTC loses the catalyst level with cross-asset confirmation." : "Wait for price and breadth to align.",
      invalidation: bias.direction === "BULLISH" ? "BTC loses the pre-event structure or macro transmission turns against risk." : bias.direction === "BEARISH" ? "BTC reclaims the pre-event structure or macro transmission turns supportive." : "No clean directional confirmation.",
      reactionRead: "Awaiting initial event response.",
      transmissionRead: "Awaiting macro → liquidity → crypto transmission.",
      warnings,
      rationale,
    };
  }

  const reaction = input.reaction;
  const reactionDirection = getInitialDirection(reaction.initialMove);
  const initialMagnitude = Math.abs(reaction.initialMove);
  const confirmation = confirmationScore(reactionDirection, reaction.crossAsset);
  let reactionState: ReactionState = "UNRESOLVED";

  // Wick != acceptance. A meaningful impulse that retraces 50%+ and loses its reaction
  // level is a failed reaction; 75%+ is treated as a strong failure.
  const failed = initialMagnitude >= 0.7 && reaction.retracement >= 0.5 && !reaction.reactionLevelHeld;
  const strongFailure = failed && reaction.retracement >= 0.75;
  const accepted = initialMagnitude >= 0.3 && reaction.reactionLevelHeld && reaction.retracement < 0.5 && confirmation >= 2;

  if (failed) reactionState = "FAILED";
  else if (accepted) reactionState = "ACCEPTED";
  else if (reactionDirection !== "NEUTRAL") reactionState = "REJECTED";

  const rQuality = reactionQuality(reaction, reactionDirection, reactionState);
  const directionMatchesBias = reactionDirection === bias.direction && reactionDirection !== "NEUTRAL";
  const oppositeReaction = reactionDirection !== "NEUTRAL" && reactionDirection !== bias.direction;
  const preEventLost = !reaction.preEventLevelHeld;

  let thesisStatus: ThesisStatus = "WEAKENED";
  if (reactionState === "ACCEPTED" && directionMatchesBias && rQuality >= 65) thesisStatus = "VALIDATED";
  if (reactionState === "FAILED" && directionMatchesBias) thesisStatus = "INVALIDATED";
  if (oppositeReaction && (reactionState === "ACCEPTED" || preEventLost)) thesisStatus = "INVALIDATED";

  let reversalRisk: HalverDecision["reversalRisk"] = "LOW";
  if (reactionState === "FAILED" || strongFailure) reversalRisk = "HIGH";
  else if (reactionState === "REJECTED" || oppositeReaction) reversalRisk = "MEDIUM";
  if (preEventLost) reversalRisk = "HIGH";

  if (reactionState === "FAILED") warnings.push(`${reactionDirection === "BULLISH" ? "Bullish" : "Bearish"} initial reaction failed acceptance.`);
  if (strongFailure) warnings.push("Strong reaction failure: retracement reached 75%+.");
  if (preEventLost) warnings.push("Pre-event level lost: reversal risk elevated.");
  if (confirmation < 2 && reactionDirection !== "NEUTRAL") warnings.push("Cross-asset confirmation is weak.");
  if (dataQuality < 0.8) warnings.push("Partial data: confirmation confidence reduced.");

  const qualityPenalty = dataQuality < 0.8 ? 10 : 0;
  const tradeability = round(clamp(
    Math.max(0, rQuality - qualityPenalty) * 0.55 + Math.abs(bias.score) * 0.25 + (reactionState === "ACCEPTED" ? 15 : 0) - (reversalRisk === "HIGH" ? 20 : reversalRisk === "MEDIUM" ? 8 : 0),
    0,
    100,
  ));

  let decision: Decision = "WAIT";
  if (reactionState === "FAILED" && directionMatchesBias) decision = "REVERSAL_WATCH";
  else if (thesisStatus === "INVALIDATED" && oppositeReaction && rQuality >= 65 && tradeability >= 65) decision = reactionDirection === "BULLISH" ? "LONG" : "SHORT";
  else if (thesisStatus === "VALIDATED" && tradeability >= 80) decision = bias.direction === "BULLISH" ? "LONG" : bias.direction === "BEARISH" ? "SHORT" : "WAIT";
  else if (rQuality < 45) decision = "NO_TRADE";

  const setupType: HalverDecision["setupType"] = reactionState === "FAILED" ? "REVERSAL" : reactionState === "ACCEPTED" ? "BREAKOUT" : Math.abs(bias.score) >= 40 ? "DIRECTIONAL" : "NO_EDGE";
  const phase: Phase = reactionState === "ACCEPTED" || reactionState === "FAILED" ? "TRANSMISSION" : "ACCEPTANCE";
  const reactionRead = reactionState === "ACCEPTED"
    ? `${reactionDirection} — confirmed acceptance. ${confirmation}/6 cross-asset confirmations.`
    : reactionState === "FAILED"
      ? `${reactionDirection} — initial response failed. Wick is not acceptance; reversal risk is ${reversalRisk.toLowerCase()}.`
      : reactionState === "REJECTED"
        ? `${reactionDirection} — initial response rejected. Wait for a clean reclaim/loss before acting.`
        : "Initial reaction unresolved.";
  const transmissionRead = confirmation >= 4
    ? "Macro and crypto transmission are aligned."
    : confirmation >= 2
      ? "Transmission is partial; confirmation is not broad enough for aggressive positioning."
      : "Transmission is weak or divergent.";

  rationale.push(`Pre-event bias: ${bias.direction} ${bias.score >= 0 ? "+" : ""}${bias.score}.`);
  rationale.push(`Initial reaction: ${reactionDirection} at ${reaction.initialMove.toFixed(2)}× expected move.`);
  rationale.push(`Acceptance: ${reactionState}; reaction quality ${rQuality}/100.`);
  rationale.push(`Cross-asset confirmation: ${confirmation}/6.`);

  return {
    phase,
    biasScore: bias.score,
    bias: bias.direction,
    bullishProbability: bias.bullishProbability,
    bearishProbability: bias.bearishProbability,
    reactionDirection,
    reactionState,
    reactionQuality: rQuality,
    thesisStatus,
    tradeability,
    decision,
    reversalRisk,
    setupType,
    edgeQuality: edgeQuality(Math.max(Math.abs(bias.score), rQuality - 50)),
    trigger: reactionState === "FAILED" ? "Reclaim failure followed by acceptance below the failed reaction level." : reactionState === "ACCEPTED" ? "Hold the reaction level with broad cross-asset confirmation." : "Wait for acceptance or rejection of the catalyst level.",
    invalidation: reactionState === "FAILED" ? "Failed level is reclaimed and held with cross-asset confirmation." : "Reaction level and pre-event structure fail against the active thesis.",
    reactionRead,
    transmissionRead,
    warnings,
    rationale,
  };
}
