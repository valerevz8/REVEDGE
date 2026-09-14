import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";
import { buildIntelligence, type RawStory, type EventState } from "../../lib/intelligence";
import { buildPredictiveLayer } from "../../lib/predictive";
import { evaluateHalver, type Direction } from "../../lib/halver/decision-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const clamp = (n: number, min = -1, max = 1) => Math.max(min, Math.min(max, n));

function directionSign(direction: Direction | "Risk-on" | "Risk-off" | "Neutral") {
  return direction === "BULLISH" || direction === "Risk-on" ? 1 : direction === "BEARISH" || direction === "Risk-off" ? -1 : 0;
}

function keywordScore(text: string, positive: string[], negative: string[]) {
  const lower = text.toLowerCase();
  const pos = positive.filter((word) => lower.includes(word)).length;
  const neg = negative.filter((word) => lower.includes(word)).length;
  if (!pos && !neg) return 0;
  return clamp((pos - neg) / Math.max(2, pos + neg));
}

function buildHalverInput(event: any) {
  const direction = directionSign(event.direction);
  const text = [event.title, event.bias, event.regime, event.sharpHeadline, event.narrative, event.tradableSetup, event.finalAction, ...(event.why ?? []), ...(event.whatToWatch ?? [])].join(" ");
  const macroPressure = keywordScore(text, ["hawkish", "rate hike", "hike", "higher rates", "tightening", "hot inflation", "strong jobs", "yield up", "dollar strength"], ["dovish", "rate cut", "cut", "lower rates", "easing", "cool inflation", "weak jobs", "yield down", "dollar weakness"]);
  const surprise = keywordScore(text, ["beat", "beats", "above", "higher than expected", "stronger than expected", "accelerates", "surge", "inflow", "approval"], ["miss", "misses", "below", "lower than expected", "weaker than expected", "slows", "drop", "outflow", "rejection"]);
  const expectation = keywordScore(event.bias ?? text, ["bullish", "risk-on", "upside", "positive", "supportive", "breakout", "accumulation"], ["bearish", "risk-off", "downside", "negative", "headwind", "breakdown", "distribution"]);
  const confirmation = clamp((Number(event.confirmation ?? 0) - 50) / 50);
  const corroboration = Math.min(1, Number(event.sourceCount ?? event.sources?.length ?? 1) / 4);
  const freshness = Number(event.ageHours ?? 12) <= 3 ? 0.25 : Number(event.ageHours ?? 12) <= 12 ? 0.1 : -0.1;
  const structure = clamp(direction * (0.45 + corroboration * 0.25 + freshness));
  const positioning = clamp(direction * (0.2 + Math.min(0.35, Number(event.impact ?? 7) / 30));
  const transmission = clamp(direction * Math.max(0.25, confirmation * 0.75 + corroboration * 0.25));
  return { market: { regime: clamp(direction * 0.65), expectations: clamp(expectation || direction * 0.45), positioning, policyPressure: macroPressure, surprise: surprise || direction * 0.25, transmission, btcStructure: structure }, dataQuality: clamp(0.55 + corroboration * 0.25 + Math.min(0.2, Number(event.confirmation ?? 0) / 500), 0, 1) };
}

function riskMapping(result: ReturnType<typeof evaluateHalver>) {
  if (result.reversalRisk === "HIGH") return { riskFlag: result.setupType === "REVERSAL" ? "REVERSAL_WATCH" : "EVENT_WHIPSAW", riskLevel: "HIGH" as const };
  if (result.reversalRisk === "MEDIUM") return { riskFlag: result.setupType === "BREAKOUT" ? "BREAKOUT_TRAP" : "MACRO_HEADWIND", riskLevel: "MEDIUM" as const };
  return { riskFlag: "NONE", riskLevel: "LOW" as const };
}

function halverPredictive(event: any) {
  const sourceDirection = event.direction as "Risk-on" | "Risk-off" | "Neutral";
  const result = evaluateHalver(buildHalverInput(event));
  const risk = riskMapping(result);
  const directional = result.bias === "BULLISH" ? "Bullish" : result.bias === "BEARISH" ? "Bearish" : "Neutral";
  const engineDirection = result.bias === "BULLISH" ? "Risk-on" : result.bias === "BEARISH" ? "Risk-off" : "Neutral";
  const directionScore = result.bias === "BULLISH" ? result.bullishProbability : result.bias === "BEARISH" ? result.bearishProbability : 50;
  const base = sourceDirection === "Risk-off" ? event.bearCase : event.bullCase;
  const riskCase = sourceDirection === "Risk-off" ? event.bullCase : event.bearCase;
  const confirmation = [result.trigger, ...(event.whatToWatch ?? [])].filter(Boolean).slice(0, 3);
  const invalidation = [result.invalidation, event.invalidation, ...(event.triggerRows ?? []).map((row: any) => row.invalidation)].filter(Boolean).slice(0, 3);
  return { directionScore, executionScore: result.tradeability ?? Math.max(35, Math.round(Math.abs(result.biasScore) * 0.7)), riskFlag: risk.riskFlag, riskLevel: risk.riskLevel, riskLabel: result.thesisStatus === "PENDING" ? `${result.edgeQuality.toLowerCase()} pre-event edge` : `${result.thesisStatus.toLowerCase()} thesis`, immediateRead: result.rationale[0] ?? `Pre-event ${directional.toLowerCase()} bias.`, baseCase: base ?? (directional === "Bullish" ? "Upside reaction holds and expands." : directional === "Bearish" ? "Downside reaction holds and expands." : "Price remains two-way until confirmation appears."), riskCase: riskCase ?? "Initial reaction fails to gain follow-through.", worstCase: sourceDirection === "Risk-off" ? (event.bearCase ?? "Downside transmission accelerates.") : (event.bearCase ?? "Breakout fails and reverses."), confirmation, invalidation, why: `${result.bullishProbability}% bullish / ${result.bearishProbability}% bearish reaction probability. ${result.transmissionRead}`, engine: "HALVER Decision Engine v2", phase: result.phase, bias: result.bias, engineDirection, thesisStatus: result.thesisStatus, edgeQuality: result.edgeQuality, setupType: result.setupType, reactionRead: result.reactionRead, transmissionRead: result.transmissionRead, warnings: result.warnings };
}

function enrich(snapshot: any) {
  if (!snapshot?.events) return snapshot;
  const events = snapshot.events.map((event: any) => {
    const predictive = halverPredictive(event);
    return { ...event, legacyDirection: event.direction, direction: predictive.bias === "NEUTRAL" ? event.direction : predictive.engineDirection, predictive, legacyPredictive: buildPredictiveLayer(event) };
  });
  return { ...snapshot, events, stories: events, predictiveEngine: "HALVER Decision Engine v2" };
}

async function getSnapshot() {
  const store = getStore("revedge-intelligence");
  const cached = await store.get("latest-intelligence", { type: "json" });
  if (cached) return enrich(cached as any);
  const news = await store.get("latest-news", { type: "json" });
  if (!news) return null;
  const result = buildIntelligence(Array.isArray(news.stories) ? news.stories as RawStory[] : [], []);
  return enrich(result.snapshot);
}

export async function GET() {
  try {
    const data = await getSnapshot();
    if (!data) return NextResponse.json({ ok: false, error: "intelligence snapshot warming up" }, { status: 503 });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30", "CDN-Cache-Control": "public, max-age=15, stale-while-revalidate=30", "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=30" } });
  } catch (error) {
    console.error("REVEDGE intelligence engine error", error);
    return NextResponse.json({ ok: false, error: "intelligence engine unavailable" }, { status: 500 });
  }
}