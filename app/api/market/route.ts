import { NextResponse } from "next/server";

const ids="bitcoin,ethereum,solana";
const symbols=[{id:"bitcoin",symbol:"BTC",name:"Bitcoin"},{id:"ethereum",symbol:"ETH",name:"Ethereum"},{id:"solana",symbol:"SOL",name:"Solana"}];
function pctChange(now:number,previous:number){return previous?((now-previous)/previous)*100:0;}
async function yahooChange(symbol:string){try{const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`,{next:{revalidate:60},headers:{accept:"application/json"}});if(!r.ok)return 0;const j=await r.json();const closes=j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;const clean=Array.isArray(closes)?closes.filter((v:any)=>Number.isFinite(Number(v))):[];return clean.length>=2?pctChange(Number(clean[clean.length-1]),Number(clean[clean.length-2])):0;}catch{return 0;}}

export async function GET(){try{
  const [marketResponse,globalResponse]=await Promise.all([
    fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=3&page=1&sparkline=true&price_change_percentage=24h`,{next:{revalidate:30},headers:{accept:"application/json"}}),
    fetch("https://api.coingecko.com/api/v3/global",{next:{revalidate:30},headers:{accept:"application/json"}}),
  ]);
  if(!marketResponse.ok||!globalResponse.ok)throw new Error("Market data request failed");
  const[data,global]=await Promise.all([marketResponse.json(),globalResponse.json()]);const globalData=global.data;const btc=data.find((x:any)=>x.id==="bitcoin");const eth=data.find((x:any)=>x.id==="ethereum");const totalMarketCap=Number(globalData?.total_market_cap?.usd??0);const btcCap=Number(btc?.market_cap??0);const ethCap=Number(eth?.market_cap??0);const total2=Math.max(0,totalMarketCap-btcCap);const total3=Math.max(0,totalMarketCap-btcCap-ethCap);const totalChange=Number(globalData?.market_cap_change_percentage_24h_usd??0);const btcChange=Number(btc?.price_change_percentage_24h??0);const ethChange=Number(eth?.price_change_percentage_24h??0);const altCapBefore=totalMarketCap/(1+totalChange/100);const btcBefore=btcCap/(1+btcChange/100);const ethBefore=ethCap/(1+ethChange/100);const total2Before=Math.max(1,altCapBefore-btcBefore);const total3Before=Math.max(1,altCapBefore-btcBefore-ethBefore);
  const coins=symbols.map(({id,symbol,name})=>{const coin=data.find((x:any)=>x.id===id);return{symbol,name,price:Number(coin?.current_price??0),change:Number(coin?.price_change_percentage_24h??0),icon:String(coin?.image??""),sparkline:Array.isArray(coin?.sparkline_in_7d?.price)?coin.sparkline_in_7d.price.slice(-24):[]};});
  if(coins.some((coin)=>!Number.isFinite(coin.price)||coin.price<=0)||!totalMarketCap)throw new Error("Incomplete market response");
  const [dxyChange,us10yChange,nasdaqChange,oilChange,goldChange]=await Promise.all([yahooChange("DX-Y.NYB"),yahooChange("^TNX"),yahooChange("NQ=F"),yahooChange("CL=F"),yahooChange("GC=F")]);
  return NextResponse.json({coins,total2,total2Change:pctChange(total2,total2Before),total3,total3Change:pctChange(total3,total3Before),goldChange,macro:{dxyChange,us10yChange,nasdaqChange,oilChange},source:"CoinGecko + Yahoo Finance",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"s-maxage=30, stale-while-revalidate=60"}});
}catch{return NextResponse.json({error:"Live market data temporarily unavailable"},{status:503});}}
