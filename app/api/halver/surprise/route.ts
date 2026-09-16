import { NextResponse } from "next/server";

type Scenario = { id: string; label: string; consequence: string; reaction: string; transmission: string; pressure: "BULLISH" | "BEARISH" | "NEUTRAL" };

const PROFILES: Record<string, { unit: string; below: Scenario; inline: Scenario; above: Scenario }> = {
  CPI: {
    unit: "inflation vs expectation",
    below: { id: "BELOW", label: "Below expectation", consequence: "Inflation pressure eases.", reaction: "Dovish repricing can support BTC risk appetite.", transmission: "DXY / yields lower → liquidity improves → crypto breadth can expand.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "No meaningful inflation surprise.", reaction: "Initial BTC response is less informative; acceptance matters more.", transmission: "Watch rates and DXY for the market's real interpretation.", pressure: "NEUTRAL" },
    above: { id: "ABOVE", label: "Above expectation", consequence: "Inflation pressure remains firmer.", reaction: "Hawkish repricing can pressure BTC and high-beta crypto.", transmission: "DXY / yields higher → liquidity tightens → breadth can contract.", pressure: "BEARISH" },
  },
  PPI: {
    unit: "producer inflation vs expectation",
    below: { id: "BELOW", label: "Below expectation", consequence: "Upstream inflation pressure eases.", reaction: "Can reduce near-term rate pressure and support risk assets.", transmission: "Rates / DXY soften → BTC can receive a liquidity tailwind.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "Limited macro surprise.", reaction: "Price acceptance becomes the primary signal.", transmission: "Follow DXY, yields and BTC breadth rather than the headline.", pressure: "NEUTRAL" },
    above: { id: "ABOVE", label: "Above expectation", consequence: "Producer inflation is firmer than expected.", reaction: "Can reinforce hawkish rate expectations.", transmission: "DXY / yields firm → crypto liquidity faces headwind.", pressure: "BEARISH" },
  },
  PCE: {
    unit: "Fed-sensitive inflation vs expectation",
    below: { id: "BELOW", label: "Below expectation", consequence: "Core inflation pressure eases.", reaction: "Supports a dovish repricing path if rates confirm.", transmission: "Yields / DXY lower → liquidity improves → BTC breadth can expand.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "No major inflation surprise.", reaction: "Wait for price and rates to reveal the interpretation.", transmission: "Cross-asset confirmation is more important than the headline.", pressure: "NEUTRAL" },
    above: { id: "ABOVE", label: "Above expectation", consequence: "Core inflation remains sticky.", reaction: "Can reinforce hawkish policy expectations.", transmission: "Yields / DXY higher → liquidity pressure → crypto breadth can contract.", pressure: "BEARISH" },
  },
  NFP: {
    unit: "labor strength vs expectation",
    below: { id: "BELOW", label: "Below expectation", consequence: "Labor momentum is weaker.", reaction: "Can support rate-cut expectations, but a severe miss may trigger growth-risk concerns.", transmission: "Rates reaction first → DXY / Nasdaq → BTC acceptance.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "Labor outcome broadly matches expectations.", reaction: "Headline edge is limited; positioning and price acceptance dominate.", transmission: "Watch yields, DXY and breadth for confirmation.", pressure: "NEUTRAL" },
    above: { id: "ABOVE", label: "Above expectation", consequence: "Labor remains stronger.", reaction: "Can delay easing expectations and pressure duration-sensitive risk.", transmission: "Yields / DXY higher → BTC faces macro headwind if price confirms.", pressure: "BEARISH" },
  },
  FOMC: {
    unit: "policy stance vs market expectation",
    below: { id: "DOVISH", label: "More dovish than expected", consequence: "Policy path becomes easier than priced.", reaction: "Bullish reaction is favored only if BTC accepts the move.", transmission: "Yields / DXY lower → Nasdaq / crypto liquidity → BTC → ETH/SOL/TOTAL3.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "Policy outcome broadly matches pricing.", reaction: "Positioning unwind and Powell guidance may dominate the initial move.", transmission: "Wait for rates, DXY and BTC acceptance to resolve direction.", pressure: "NEUTRAL" },
    above: { id: "HAWKISH", label: "More hawkish than expected", consequence: "Policy path becomes tighter than priced.", reaction: "Bearish reaction is favored only if BTC loses the event level and macro confirms.", transmission: "Yields / DXY higher → liquidity tightens → BTC → alt breadth.", pressure: "BEARISH" },
  },
  JOLTS: {
    unit: "job openings vs expectation",
    below: { id: "BELOW", label: "Below expectation", consequence: "Labor demand cools.", reaction: "Can ease rate pressure if the growth signal is not interpreted as recessionary.", transmission: "Rates / DXY → Nasdaq → BTC acceptance.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "Labor demand broadly matches expectations.", reaction: "Limited headline edge; wait for price confirmation.", transmission: "Cross-asset confirmation decides tradeability.", pressure: "NEUTRAL" },
    above: { id: "ABOVE", label: "Above expectation", consequence: "Labor demand remains stronger.", reaction: "Can keep policy expectations firmer.", transmission: "Yields / DXY → BTC risk appetite.", pressure: "BEARISH" },
  },
  MACRO: {
    unit: "release vs expectation",
    below: { id: "BELOW", label: "Below expectation", consequence: "Macro pressure is weaker than expected.", reaction: "Potentially supportive for risk assets if rates confirm.", transmission: "Macro → liquidity → BTC acceptance.", pressure: "BULLISH" },
    inline: { id: "INLINE", label: "In line", consequence: "No major surprise.", reaction: "Price structure becomes the primary signal.", transmission: "Watch cross-asset confirmation.", pressure: "NEUTRAL" },
    above: { id: "ABOVE", label: "Above expectation", consequence: "Macro pressure is stronger than expected.", reaction: "Potential risk-off pressure if rates and DXY confirm.", transmission: "Macro → liquidity → BTC acceptance.", pressure: "BEARISH" },
  },
};

function typeOf(title: string, supplied?: string | null) {
  if (supplied && PROFILES[supplied.toUpperCase()]) return supplied.toUpperCase();
  const t = title.toUpperCase();
  if (t.includes("FOMC")) return "FOMC";
  if (t.includes("CPI")) return "CPI";
  if (t.includes("PPI")) return "PPI";
  if (t.includes("PCE")) return "PCE";
  if (t.includes("NFP") || t.includes("EMPLOYMENT")) return "NFP";
  if (t.includes("JOLTS")) return "JOLTS";
  return "MACRO";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "Macro Catalyst";
  const type = typeOf(title, url.searchParams.get("eventType"));
  const profile = PROFILES[type];
  return NextResponse.json({ ok: true, eventType: type, title, unit: profile.unit, scenarios: [profile.below, profile.inline, profile.above], note: "Scenario map only. It does not claim the actual release or a guaranteed market response. Acceptance and cross-asset transmission must validate the path." }, { headers: { "Cache-Control": "no-store" } });
}
