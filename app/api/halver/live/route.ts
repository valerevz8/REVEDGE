import { NextRequest, NextResponse } from "next/server";
import { evaluateHalver, type CrossAsset, type HalverInput } from "../../../lib/halver/decision-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const clamp = (n: number, min = -1, max = 1) => Math.max(min, Math.min(max, n));
const pctSignal = (value: number, scale: number) => clamp(value / scale);

function num(params: URLSearchParams, key: string, fallback = 0) {
  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function classifyEvent(title = "", category = "") {
  const t = `${title} ${category}`.toUpperCase();
  if (t.includes("FOMC")) return { type: "FOMC", policyPressure: 0.915, sensitivity: 1.0 };
  if (t.includes("CPI")) return { type: "CPI", policyPressure: 0.65, sensitivity: 0.95 };
  if (t.includes("PCE")) return { type: "PCE", policyPressure: 0.65, sensitivity: 0.95 };
  if (t.includes("PPI")) return { type: "PPI", policyPressure: 0.45, sensitivity: 0.8 };
  if (t.includes("NFP") || t.includes("EMPLOYMENT SITUATION")) return { type: "NFP", policyPressure: 0.35, sensitivity: 0.8 };
  if (t.includes("JOLTS")) return { type: "JOLTS", policyPressure: 0.2, sensitivity: 0.6 };
  return { type: "MACRO", policyPressure: 0.15, sensitivity: 0.55 };
}

function buildMarketInput(market: any, params: URLSearchParams): HalverInput["market"] {
  const btc = Number(market?.coins?.find((c: any) => c.symbol === "BTC")?.change ?? 0);
  const eth = Number(market?.coins?.find((c: any) => c.symbol === "ETH")?.change ?? 0);
  const sol = Number(market?.coins?.find((c: any) => c.symbol === "SOL")?.change ?? 0);
  const total3 = Number(market?.total3Change ?? 0);
  const dxy = Number(market?.crossAsset?.dxy?.changePct ?? 0);
  const yields = Number(market?.crossAsset?.yields10y?.changePct ?? 0);
  const nasdaq = Number(market?.crossAsset?.nasdaq?.changePct ?? 0);
  const profile = classifyEvent(params.get("eventType") ?? "", params.get("eventCategory") ?? "");

  const cryptoRegime = clamp(btc * 0.45 / 2 + eth * 0.2 / 2 + sol * 0.15 / 2 + total3 * 0.2 / 2);
  const transmission = clamp((nasdaq / 1.5 - dxy / 1.5 - yields / 0.5 + total3 / 2) / 4);
  const policyPressure = params.has("policyPressure")
    ? num(params, "policyPressure")
    : params.has("preset")
      ? num(params, "policyPressure", profile.policyPressure)
      : profile.policyPressure;

  return {
    regime: cryptoRegime,
    expectations: num(params, "expectations", cryptoRegime * profile.sensitivity),
    positioning: num(params, "positioning", pctSignal(btc, 2)),
    policyPressure: clamp(policyPressure),
    surprise: num(params, "surprise", 0),
    transmission,
    btcStructure: pctSignal(btc, 2),
  };
}

function buildReactionInput(reaction: any, market: any): HalverInput["reaction"] {
  const expected = Math.max(0.1, Number(reaction.expectedMovePct ?? 0.5));
  const dxy = Number(market?.crossAsset?.dxy?.changePct ?? 0);
  const yields = Number(market?.crossAsset?.yields10y?.changePct ?? 0);
  const nasdaq = Number(market?.crossAsset?.nasdaq?.changePct ?? 0);
  const eth = Number(market?.coins?.find((c: any) => c.symbol === "ETH")?.change ?? 0);
  const sol = Number(market?.coins?.find((c: any) => c.symbol === "SOL")?.change ?? 0);
  const total3 = Number(market?.total3Change ?? 0);
  const initialPct = Number(reaction.reaction?.initialMovePct ?? 0);

  const crossAsset: CrossAsset = {
    dxy: pctSignal(-dxy, 1.5),
    yields: pctSignal(-yields, 0.5),
    nasdaq: pctSignal(nasdaq, 1.5),
    eth: pctSignal(eth, 2),
    sol: pctSignal(sol, 2),
    total3: pctSignal(total3, 2),
  };

  return {
    initialMove: Math.sign(initialPct) * Number(reaction.reaction?.initialMoveMultiple ?? 0),
    retracement: Number(reaction.reaction?.retracementPct ?? 0),
    reactionLevelHeld: Boolean(reaction.reaction?.reactionLevelHeld),
    preEventLevelHeld: Boolean(reaction.reaction?.preEventLevelHeld),
    followThrough: clamp(Number(reaction.reaction?.followThroughPct ?? 0) / expected),
    volume: clamp(Number(reaction.reaction?.volumeRatio ?? 1) / 2, 0, 1),
    oiPositioning: 0,
    crossAsset,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventMs = num(searchParams, "eventMs", 0);
    const expectedMovePct = searchParams.get("expectedMovePct");
    const eventType = searchParams.get("eventType") || classifyEvent(searchParams.get("event") || "", searchParams.get("eventCategory") || "").type;

    const marketResponse = await fetch(new URL("/api/market", request.url), {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!marketResponse.ok) throw new Error("Market data unavailable");
    const market = await marketResponse.json();

    let reaction: any = null;
    if (eventMs > 0 && eventMs <= Date.now()) {
      const reactionUrl = new URL("/api/halver/reaction", request.url);
      reactionUrl.searchParams.set("eventMs", String(eventMs));
      if (expectedMovePct) reactionUrl.searchParams.set("expectedMovePct", expectedMovePct);
      const reactionResponse = await fetch(reactionUrl, { cache: "no-store", headers: { accept: "application/json" } });
      if (reactionResponse.ok) reaction = await reactionResponse.json();
    }

    const input: HalverInput = {
      market: buildMarketInput(market, searchParams),
      dataQuality: market?.crossAsset ? 0.9 : 0.7,
      ...(reaction?.reaction ? { reaction: buildReactionInput(reaction, market) } : {}),
    };

    const result = evaluateHalver(input);
    const profile = classifyEvent(eventType, searchParams.get("eventCategory") || "");

    return NextResponse.json({
      ok: true,
      engine: "HALVER Decision Engine v2",
      eventType: profile.type,
      eventProfile: { policySensitivity: profile.policyPressure, directionalSensitivity: profile.sensitivity },
      mode: reaction?.reaction ? "POST_EVENT" : "PRE_EVENT",
      eventMs: eventMs || null,
      preset: searchParams.get("preset") || null,
      market: {
        btc: market?.coins?.find((c: any) => c.symbol === "BTC") ?? null,
        eth: market?.coins?.find((c: any) => c.symbol === "ETH") ?? null,
        sol: market?.coins?.find((c: any) => c.symbol === "SOL") ?? null,
        total3Change: market?.total3Change ?? 0,
        crossAsset: market?.crossAsset ?? null,
      },
      reaction,
      input,
      result,
      dataQuality: input.dataQuality ?? 0,
      sources: {
        market: market?.source ?? "Live market feed",
        reaction: reaction?.source ?? "Binance spot 1m klines",
        calendar: "HALVER catalyst calendar",
      },
      observedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("HALVER live engine error", error);
    return NextResponse.json({ ok: false, error: "HALVER live engine unavailable" }, { status: 503 });
  }
}
