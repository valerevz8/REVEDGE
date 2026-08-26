import { NextResponse } from "next/server";

const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

export async function GET() {
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
          next: { revalidate: 10 },
        });
        if (!response.ok) throw new Error(`Binance ${symbol} failed`);
        const data = await response.json();
        return {
          symbol: symbol.replace("USDT", ""),
          price: Number(data.lastPrice),
          change: Number(data.priceChangePercent),
        };
      }),
    );

    return NextResponse.json({ coins: results, source: "Binance", updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "Live market data temporarily unavailable" }, { status: 503 });
  }
}
