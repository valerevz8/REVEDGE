export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
export type Decision = "LONG" | "SHORT" | "WAIT" | "NO_TRADE" | "REVERSAL_WATCH";
export type ReactionState = "UNRESOLVED" | "ACCEPTED" | "REJECTED" | "FAILED";

export interface HalverInput {
  market: {
    regime: number; // -1..1
    expectations: number; // -1..1, positive = bullish asset expectation
    positioning: number; // -1..1, positive = supportive, negative = crowded/fragile
    policyPressure: number; // -1..1, positive = hawkish, negative = dovish
    surprise: number; // -1..1, positive = bullish asset surprise
    transmission: number; // -1..1
    btcStructure: number; // -1..1
  };
  reaction?: {
    initialMove: number; // signed multiple of expected event move
    retracement: number; // 0..1 of initial impulse retraced
    reactionLevelHeld: boolean;
    preEventLevelHeld: boolean;
    followThrough: number; // -1..1
    volume: number; // 0..1
    oiPositioning: number; // -1..1, positive supports direction
    crossAsset: {
      dxy: number; // positive = bullish BTC confirmation (DXY down)
      yields: number; // positive = bullish BTC confirmation (yields down)
      nasdaq: number;
      eth: number;
      sol: number;
      total3: number;
    };
  };
  dataQuality?: number; // 0..1
}

export interface HalverDecision {
  biasScore: number;
  bias: Direction;
  bullishProbability: number;
  bearishProbability: number;
  reactionDirection: Direction;
  reactionState: ReactionState;
  reactionQuality: number | null;
  thesisStatus: "PENDING" | "VALIDATED" | "WEAKENED" | "INVALIDATED";
  tradeability: number | null;
  decision: Decision;
  reversalRisk: "LOW" | "MEDIUM" | "HIGH";
  warnings: string[];
  rationale: string[];
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round = (n: number) => Math.round(n);
const signDirection = (score: number): Direction => score >= 40 ? "BULLISH" : score <= -40 ? "BEARISH" : "NEUTRAL";

type CrossAsset = NonNullable<HalverInput["reaction"]>["crossAsset"];
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
  const assetPolicy = -input.policyPressure;
  const raw =
    input.regime * weights.regime +
    input.expectations * weights.expectations +
    input.positioning * weights.positioning +
    assetPolicy * weights.policyPressure +
    input.surprise * weights.surprise +
    input.transmission * weights.transmission +
    input.btcStructure * weights.btcStructure;

  const score = clamp(raw * dataQuality, -100, 100);
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
  const confirmed = values.filter((v) => direction === "BULLISH" ? v >= 0.35 : v <= -0.35).length;
  return confirmed;
}

function reactionQuality(reaction: Reaction, direction: Direction, state: ReactionState) {
  if (direction === "NEUTRAL") return 0;
  const acceptance = state === "ACCEPTED" ? 100 : state === "REJECTED" ? 20 : state === "FAILED" ? 0 : 50;
  const cross = confirmationScore(direction, reaction.crossAsset);
  const macroConfirmation = direction === "BULLISH"
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
    acceptance * 0.30 + macroConfirmation * 0.20 + crossScore * 0.20 + volume * 0.10 + oi * 0.10 + follow * 0.10,
    0,
    100,
  ));
}

export function evaluateHalver(input: HalverInput): HalverDecision {
  const dataQuality = clamp(input.dataQuality ?? 1, 0, 1);
  const bias = calculateBias(input.market, dataQuality);
  const warnings: string[] = [];
  const rationale: string[] = [];

  if (!input.reaction) {
    rationale.push(`Pre-event ${bias.direction.toLowerCase()} bias with ${bias.bullishProbability}% bullish reaction probability.`);
    if (dataQuality < 0.8) warnings.push("Partial data: confirmation confidence reduced.");
    return {
      biasScore: bias.score,
      bias: bias.direction,
      bullishProbability: bias.bullishProbability,
      bearishProbability: bias.bearishProbability,
      reactionDirection: "NEUTRAL",
      reactionState: "UNRESOLVED",
      reactionQuality: null,
      thesisStatus: "PENDING",
      tradeability: null,
      decision: "WAIT",
      reversalRisk: "LOW",
      warnings,
      rationale,
    };
  }

  const reaction = input.reaction;
  const reactionDirection = getInitialDirection(reaction.initialMove);
  const initialMagnitude = Math.abs(reaction.initialMove);
  let reactionState: ReactionState = "UNRESOLVED";

  // Hard HALVER rules: a meaningful impulse that retraces 50%+ and loses its reaction
  // level is a failed reaction. 75%+ retracement is a strong failure.
  const failed = initialMagnitude >= 0.7 && reaction.retracement >= 0.5 && !reaction.reactionLevelHeld;
  const strongFailure = failed && reaction.retracement >= 0.75;
  const accepted = initialMagnitude >= 0.3 && reaction.reactionLevelHeld && reaction.retracement < 0.5 && confirmationScore(reactionDirection, reaction.crossAsset) >= 2;

  if (failed) reactionState = "FAILED";
  else if (accepted) reactionState = "ACCEPTED";
  else if (reactionDirection !== "NEUTRAL") reactionState = "REJECTED";

  const quality = reactionQuality(reaction, reactionDirection, reactionState);
  const directionMatchesBias = reactionDirection === bias.direction && reactionDirection !== "NEUTRAL";
  const oppositeReaction = reactionDirection !== "NEUTRAL" && reactionDirection !== bias.direction;
  const preEventLost = !reaction.preEventLevelHeld;

  let thesisStatus: HalverDecision["thesisStatus"] = "WEAKENED";
  if (reactionState === "ACCEPTED" && directionMatchesBias && quality >= 65) thesisStatus = "VALIDATED";
  if (reactionState === "FAILED" && directionMatchesBias) thesisStatus = "INVALIDATED";
  if (oppositeReaction && (reactionState === "ACCEPTED" || preEventLost)) thesisStatus = "INVALIDATED";

  let reversalRisk: HalverDecision["reversalRisk"] = "LOW";
  if (reactionState === "FAILED" || strongFailure) reversalRisk = "HIGH";
  else if (reactionState === "REJECTED" || oppositeReaction) reversalRisk = "MEDIUM";
  if (preEventLost) reversalRisk = "HIGH";

  if (reactionState === "FAILED") warnings.push(`${reactionDirection === "BULLISH" ? "Bullish" : "Bearish"} initial reaction failed acceptance.`);
  if (strongFailure) warnings.push("Strong reaction failure: retracement reached 75%+.");
  if (preEventLost) warnings.push("Pre-event level lost: reversal risk elevated.");
  if (confirmationScore(reactionDirection, reaction.crossAsset) < 2 && reactionDirection !== "NEUTRAL") warnings.push("Cross-asset confirmation is weak.");
  if (dataQuality < 0.8) warnings.push("Partial data: confirmation confidence reduced.");

  const qualityPenalty = dataQuality < 0.8 ? 10 : 0;
  const tradeability = round(clamp(
    Math.max(0, quality - qualityPenalty) * 0.55 + (Math.abs(bias.score) * 0.25) + (reactionState === "ACCEPTED" ? 15 : 0) - (reversalRisk === "HIGH" ? 20 : reversalRisk === "MEDIUM" ? 8 : 0),
    0,
    100,
  ));

  let decision: Decision = "WAIT";
  if (reactionState === "FAILED" && directionMatchesBias) decision = "REVERSAL_WATCH";
  else if (thesisStatus === "INVALIDATED" && oppositeReaction && quality >= 65 && tradeability >= 65) decision = reactionDirection === "BULLISH" ? "LONG" : "SHORT";
  else if (thesisStatus === "VALIDATED" && tradeability >= 80) decision = bias.direction === "BULLISH" ? "LONG" : bias.direction === "BEARISH" ? "SHORT" : "WAIT";
  else if (thesisStatus === "VALIDATED" || quality >= 65) decision = "WAIT";
  else if (quality < 45) decision = "NO_TRADE";

  rationale.push(`Pre-event bias: ${bias.direction} ${bias.score >= 0 ? "+" : ""}${bias.score}.`);
  rationale.push(`Initial reaction: ${reactionDirection} at ${reaction.initialMove.toFixed(2)}× expected move.`);
  rationale.push(`Acceptance: ${reactionState}; reaction quality ${quality}/100.`);
  rationale.push(`Cross-asset confirmation: ${confirmationScore(reactionDirection, reaction.crossAsset)}/6.`);

  return {
    biasScore: bias.score,
    bias: bias.direction,
    bullishProbability: bias.bullishProbability,
    bearishProbability: bias.bearishProbability,
    reactionDirection,
    reactionState,
    reactionQuality: quality,
    thesisStatus,
    tradeability,
    decision,
    reversalRisk,
    warnings,
    rationale,
  };
}
