import { NextResponse } from "next/server";

const ids = "bitcoin,ethereum,solana,ripple,dogecoin";
const symbols = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
];

export async function GET() {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=5&page=1&sparkline=true&price_change_percentage=24h`,
      { next: { revalidate: 30 }, headers: { accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`CoinGecko market request failed: ${response.status}`);

    const data = await response.json();
    const coins = symbols.map(({ id, symbol, name }) => {
      const coin = data.find((item: any) => item.id === id);
      return {
        symbol,
        name,
        price: Number(coin?.current_price ?? 0),
        change: Number(coin?.price_change_percentage_24h ?? 0),
        icon: String(coin?.image ?? ""),
        sparkline: Array.isArray(coin?.sparkline_in_7d?.price)
          ? coin.sparkline_in_7d.price.slice(-24)
          : [],
      };
    });

    if (coins.some((coin) => !Number.isFinite(coin.price) || coin.price <= 0)) {
      throw new Error("Incomplete market response");
    }

    return NextResponse.json(
      { coins, source: "CoinGecko", updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ error: "Live market data temporarily unavailable" }, { status: 503 });
  }
}
