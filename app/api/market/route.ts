import { NextResponse } from "next/server";

const ids = "bitcoin,ethereum,solana";

export async function GET() {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 }, headers: { accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`CoinGecko market request failed: ${response.status}`);
    const data = await response.json();
    const coins = [
      { symbol: "BTC", price: Number(data.bitcoin?.usd ?? 0), change: Number(data.bitcoin?.usd_24h_change ?? 0) },
      { symbol: "ETH", price: Number(data.ethereum?.usd ?? 0), change: Number(data.ethereum?.usd_24h_change ?? 0) },
      { symbol: "SOL", price: Number(data.solana?.usd ?? 0), change: Number(data.solana?.usd_24h_change ?? 0) },
    ];
    if (coins.some((coin) => !Number.isFinite(coin.price) || coin.price <= 0)) throw new Error("Incomplete market response");
    return NextResponse.json({ coins, source: "CoinGecko", updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Live market data temporarily unavailable" }, { status: 503 });
  }
}
