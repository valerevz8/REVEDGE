import { NextResponse } from "next/server";
import { evaluateHalver, type HalverInput } from "../../../../lib/halver/decision-engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HalverInput;
    if (!body?.market) {
      return NextResponse.json({ error: "market input is required" }, { status: 400 });
    }
    return NextResponse.json({ engine: "HALVER Decision Engine v1", result: evaluateHalver(body) });
  } catch {
    return NextResponse.json({ error: "Invalid HALVER decision payload" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    engine: "HALVER Decision Engine v1",
    status: "ready",
    philosophy: "Predict → Observe → Validate → Adapt → Decide",
    rules: {
      highImpact: ">70",
      failedReaction: "initial move >= 0.7x expected move AND retracement >= 50% AND reaction level lost",
      strongFailure: "failed reaction with retracement >= 75%",
      acceptance: "reaction level held AND retracement < 50% AND >=2/6 cross-asset confirmations",
      confirmation: "DXY, yields, Nasdaq, ETH, SOL, TOTAL3",
    },
  });
}
