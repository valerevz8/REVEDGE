import { NextRequest, NextResponse } from "next/server";
import { buildReactionWindow, type Kline } from "../../../lib/halver/reaction-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function estimateExpectedMove(klines: Kline[], eventIndex: number) {
  const pre = klines.slice(Math.max(1, eventIndex - 30), eventIndex);
  const returns = pre.map((k, i) => {
    const previous = pre[i - 1];
    if (!previous || previous.close <= 0 || k.close <= 0) return 0;
    return Math.abs((k.close - previous.close) / previous.close) * 100;
  }).filter((value) => value > 0);
  if (!returns.length) return 0.5;
  const sorted = [...returns].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0.1;
  return Number(Math.max(0.2, Math.min(3, median * Math.sqrt(5) * 1.5)).toFixed(3));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventMs = numberParam(searchParams.get("eventMs"), 0);
    const requestedExpectedMove = searchParams.get("expectedMovePct");
    const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();

    if (!eventMs || eventMs < 1) {
      return NextResponse.json({ ok: false, error: "eventMs is required" }, { status: 400 });
    }

    const now = Date.now();
    const startTime = Math.max(eventMs - 35 * 60_000, now - 2 * 60 * 60_000);
    const endTime = Math.min(eventMs + 60 * 60_000, now);
    if (endTime <= startTime) {
      return NextResponse.json({ ok: true, phase: "PRE_EVENT", reaction: null, reason: "Event has not occurred yet." });
    }

    const endpoint = new URL("https://api.binance.com/api/v3/klines");
    endpoint.searchParams.set("symbol", symbol);
    endpoint.searchParams.set("interval", "1m");
    endpoint.searchParams.set("startTime", String(startTime));
    endpoint.searchParams.set("endTime", String(endTime));
    endpoint.searchParams.set("limit", "100");

    const response = await fetch(endpoint.toString(), {
      next: { revalidate: 15 },
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Binance reaction request failed: ${response.status}`);

    const rows = await response.json();
    const klines: Kline[] = Array.isArray(rows)
      ? rows.map((row: any[]) => ({
          openTime: Number(row[0]),
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
        })).filter((k: Kline) => Number.isFinite(k.openTime) && k.close > 0)
      : [];

    const eventIndex = klines.findIndex((k) => k.openTime >= eventMs);
    if (eventIndex < 0 || klines.length < 2) {
      return NextResponse.json({ ok: true, phase: "PRE_EVENT", reaction: null, reason: "Insufficient post-event candles yet." });
    }

    const window = klines.slice(Math.max(0, eventIndex - 30), Math.min(klines.length, eventIndex + 31));
    const windowPivot = Math.min(30, Math.max(1, eventIndex));
    const expectedMovePct = requestedExpectedMove
      ? Math.max(0.1, numberParam(requestedExpectedMove, 0.5))
      : estimateExpectedMove(klines, eventIndex);
    const reaction = buildReactionWindow(window, expectedMovePct, windowPivot);
    if (!reaction) throw new Error("Unable to calculate reaction window");

    return NextResponse.json({
      ok: true,
      phase: reaction.observedMinutes >= 15 ? "TRANSMISSION" : reaction.observedMinutes >= 5 ? "ACCEPTANCE" : "INITIAL_REACTION",
      symbol,
      eventMs,
      expectedMovePct,
      expectedMoveSource: requestedExpectedMove ? "manual" : "pre-event 1m volatility",
      observedAt: new Date().toISOString(),
      reaction,
      source: "Binance spot 1m klines",
    }, { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } });
  } catch (error) {
    console.error("HALVER reaction engine error", error);
    return NextResponse.json({ ok: false, error: "Reaction data temporarily unavailable" }, { status: 503 });
  }
}
