import { NextResponse } from "next/server";

type Asset = { id: string; symbol: string };
type Sector = { name: string; assets: Asset[] };

const sectors: Sector[] = [
  { name: "Memecoins", assets: [
    { id: "dogecoin", symbol: "DOGE" }, { id: "shiba-inu", symbol: "SHIB" }, { id: "pepe", symbol: "PEPE" },
    { id: "bonk", symbol: "BONK" }, { id: "dogwifcoin", symbol: "WIF" }, { id: "floki", symbol: "FLOKI" },
  ] },
  { name: "AI / Compute", assets: [
    { id: "artificial-superintelligence-alliance", symbol: "FET" }, { id: "bittensor", symbol: "TAO" },
    { id: "render-token", symbol: "RENDER" }, { id: "near", symbol: "NEAR" }, { id: "akash-network", symbol: "AKT" }, { id: "arweave", symbol: "AR" },
  ] },
  { name: "DeFi", assets: [
    { id: "aave", symbol: "AAVE" }, { id: "uniswap", symbol: "UNI" }, { id: "maker", symbol: "MKR" },
    { id: "lido-dao", symbol: "LDO" }, { id: "curve-dao-token", symbol: "CRV" }, { id: "jupiter-exchange-solana", symbol: "JUP" },
  ] },
  { name: "Layer 1", assets: [
    { id: "solana", symbol: "SOL" }, { id: "avalanche-2", symbol: "AVAX" }, { id: "sui", symbol: "SUI" },
    { id: "aptos", symbol: "APT" }, { id: "near", symbol: "NEAR" }, { id: "injective-protocol", symbol: "INJ" },
  ] },
  { name: "Layer 2", assets: [
    { id: "arbitrum", symbol: "ARB" }, { id: "optimism", symbol: "OP" }, { id: "starknet", symbol: "STRK" },
    { id: "zksync", symbol: "ZK" }, { id: "manta-network", symbol: "MANTA" }, { id: "immutable-x", symbol: "IMX" },
  ] },
];

export async function GET() {
  try {
    const all = sectors.flatMap((sector) => sector.assets);
    const ids = [...new Set(all.map((asset) => asset.id))].join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 }, headers: { accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`CoinGecko sector request failed: ${response.status}`);
    const data = await response.json();

    const rows = (assets: Asset[]) => assets
      .map((asset) => ({ symbol: asset.symbol, change: Number(data[asset.id]?.usd_24h_change ?? NaN) }))
      .filter((row) => Number.isFinite(row.change));

    const ranked = sectors.map((sector) => {
      const values = rows(sector.assets);
      if (!values.length) return null;
      const change = values.reduce((sum, row) => sum + row.change, 0) / values.length;
      const breadth = Math.round((values.filter((row) => row.change > 0).length / values.length) * 100);
      return { name: sector.name, change: Number(change.toFixed(2)), breadth, leaders: [...values].sort((a, b) => b.change - a.change).slice(0, 3) };
    }).filter(Boolean).sort((a, b) => b!.change - a!.change).slice(0, 3);

    const memeRows = rows(sectors[0].assets).sort((a, b) => b.change - a.change);
    const memeBreadth = memeRows.length ? Math.round((memeRows.filter((row) => row.change > 0).length / memeRows.length) * 100) : 0;

    return NextResponse.json({
      sectors: ranked,
      meme: { breadth: memeBreadth, leaders: memeRows.slice(0, 5) },
      updatedAt: new Date().toISOString(),
      source: "CoinGecko",
    }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: "Live sector data temporarily unavailable" }, { status: 503 });
  }
}
