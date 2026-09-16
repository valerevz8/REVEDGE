import { NextResponse } from "next/server";

const ids = "bitcoin,ethereum,solana";
const symbols = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

function pctChange(now: number, previous: number) {
  if (!previous) return 0;
  return ((now - previous) / previous) * 100;
}

async function yahooChange(symbol: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`,
      { next: { revalidate: 60 }, headers: { accept: "application/json" } },
    );
    if (!response.ok) return { value: null, changePct: 0 };
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const closes = Array.isArray(result?.indicators?.quote?.[0]?.close)
      ? result.indicators.quote[0].close.filter((value: any) => Number.isFinite(Number(value)))
      : [];
    if (!closes.length) return { value: null, changePct: 0 };
    const value = Number(closes[closes.length - 1]);
    const previous = closes.length >= 2 ? Number(closes[closes.length - 2]) : value;
    return { value, changePct: pctChange(value, previous) };
  } catch {
    return { value: null, changePct: 0 };
  }
}

export async function GET() {
  try {
    const [marketResponse, globalResponse, dxy, yields10y, nasdaq, gold] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=3&page=1&sparkline=true&price_change_percentage=24h`,
        { next: { revalidate: 30 }, headers: { accept: "application/json" } },
      ),
      fetch("https://api.coingecko.com/api/v3/global", {
        next: { revalidate: 30 },
        headers: { accept: "application/json" },
      }),
      yahooChange("DX-Y.NYB"),
      yahooChange("^TNX"),
      yahooChange("^IXIC"),
      yahooChange("GC=F"),
    ]);

    if (!marketResponse.ok || !globalResponse.ok) throw new Error("Market data request failed");

    const [data, global] = await Promise.all([marketResponse.json(), globalResponse.json()]);
    const globalData = global.data;
    const btc = data.find((item: any) => item.id === "bitcoin");
    const eth = data.find((item: any) => item.id === "ethereum");
    const totalMarketCap = Number(globalData?.total_market_cap?.usd ?? 0);
    const btcCap = Number(btc?.market_cap ?? 0);
    const ethCap = Number(eth?.market_cap ?? 0);

    const total2 = Math.max(0, totalMarketCap - btcCap);
    const total3 = Math.max(0, totalMarketCap - btcCap - ethCap);

    const totalChange = Number(globalData?.market_cap_change_percentage_24h_usd ?? 0);
    const btcChange = Number(btc?.price_change_percentage_24h ?? 0);
    const ethChange = Number(eth?.price_change_percentage_24h ?? 0);
    const altCapBefore = totalMarketCap / (1 + totalChange / 100);
    const btcBefore = btcCap / (1 + btcChange / 100);
    const ethBefore = ethCap / (1 + ethChange / 100);
    const total2Before = Math.max(1, altCapBefore - btcBefore);
    const total3Before = Math.max(1, altCapBefore - btcBefore - ethBefore);

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

    if (coins.some((coin) => !Number.isFinite(coin.price) || coin.price <= 0) || !totalMarketCap) {
      throw new Error("Incomplete market response");
    }

    return NextResponse.json(
      {
        coins,
        total2,
        total2Change: pctChange(total2, total2Before),
        total3,
        total3Change: pctChange(total3, total3Before),
        goldChange: gold.changePct,
        crossAsset: {
          dxy: { value: dxy.value, changePct: dxy.changePct },
          yields10y: { value: yields10y.value, changePct: yields10y.changePct },
          nasdaq: { value: nasdaq.value, changePct: nasdaq.changePct },
        },
        source: "CoinGecko + Yahoo Finance",
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ error: "Live market data temporarily unavailable" }, { status: 503 });
  }
}
