import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candle = { open:number; high:number; low:number; close:number; volume:number; openTime:number };
const clamp=(n:number,min=-1,max=1)=>Math.max(min,Math.min(max,n));
const pct=(a:number,b:number)=>b>0?((a-b)/b)*100:0;

async function candles(symbol:string):Promise<Candle[]>{
  const u=new URL("https://api.binance.com/api/v3/klines");
  u.searchParams.set("symbol",symbol); u.searchParams.set("interval","5m"); u.searchParams.set("limit","72");
  const r=await fetch(u.toString(),{cache:"no-store",headers:{accept:"application/json"}});
  if(!r.ok) throw new Error("fast market feed");
  const rows=await r.json();
  return (Array.isArray(rows)?rows:[]).map((x:any[])=>({openTime:Number(x[0]),open:Number(x[1]),high:Number(x[2]),low:Number(x[3]),close:Number(x[4]),volume:Number(x[5])})).filter((x:Candle)=>Number.isFinite(x.close)&&x.close>0);
}

function signal(c:Candle[]){
  if(c.length<24) return null;
  const last=c[c.length-1], c1=c[c.length-2]?.close??last.close, c3=c[c.length-4]?.close??last.close, c12=c[c.length-13]?.close??last.close, c36=c[Math.max(0,c.length-37)]?.close??last.close;
  const r5=pct(last.close,c1), r15=pct(last.close,c3), r60=pct(last.close,c12), r180=pct(last.close,c36);
  const prior=c.slice(-13,-1), hi=Math.max(...prior.map(x=>x.high)), lo=Math.min(...prior.map(x=>x.low)), range=Math.max(.000001,hi-lo);
  const closeLocation=clamp(((last.close-lo)/range)*2-1), brokeHigh=last.high>hi&&last.close<=hi, brokeLow=last.low<lo&&last.close>=lo, breakdown=last.close<lo, breakout=last.close>hi;
  const avgVol=prior.reduce((s,x)=>s+x.volume,0)/Math.max(1,prior.length), volumeRatio=avgVol>0?last.volume/avgVol:1;
  const momentum=clamp(r5/.45)*.20+clamp(r15/.85)*.30+clamp(r60/1.5)*.35+clamp(r180/3)*.15;
  const structure=breakdown?-.75:breakout?.75:brokeHigh?-.45:brokeLow?.45:closeLocation*.35;
  const volumeBoost=clamp((volumeRatio-1)/1.5)*.12;
  const score=clamp(momentum+structure+volumeBoost);
  return {score,r5,r15,r60,r180,volumeRatio,closeLocation,breakout,breakdown,rejectionUp:brokeHigh,rejectionDown:brokeLow};
}

export async function GET(){
  try{
    const [btc,eth,sol]=await Promise.all([candles("BTCUSDT"),candles("ETHUSDT"),candles("SOLUSDT")]);
    const b=signal(btc),e=signal(eth),s=signal(sol);
    if(!b||!e||!s) throw new Error("insufficient fast market data");
    const breadth=clamp((e.score-b.score)*.5+(s.score-b.score)*.5);
    const composite=clamp(b.score*.65+breadth*.20+(e.score*.5+s.score*.5)*.15);
    return NextResponse.json({ok:true,timeframe:"5m",direction:composite>=.18?"BULLISH":composite<=-.18?"BEARISH":"NEUTRAL",score:Math.round(composite*100),bullishProbability:Math.round(50+composite*50),bearishProbability:Math.round(50-composite*50),btc:b,eth:e,sol:s,breadth:Math.round(breadth*100),observedAt:new Date().toISOString(),source:"Binance spot 5m klines"},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("HALVER fast market error",error);
    return NextResponse.json({ok:false,error:"Fast market data temporarily unavailable"},{status:503});
  }
}
