"use client";

import { useEffect, useState } from "react";

type State={bias:string;score:number;decision:string;risk:string;thesis:string;tradeability:number|null};
export default function HalverBrainLive(){
 const[state,setState]=useState<State|null>(null);
 useEffect(()=>{let active=true;const load=async()=>{try{const[m,c]=await Promise.all([fetch("/api/market",{cache:"no-store"}),fetch("/api/calendar",{cache:"no-store"})]);if(!m.ok||!c.ok)return;const market=await m.json(),calendar=await c.json(),coins=market.coins??[];const btc=coins.find((x:{symbol:string})=>x.symbol==="BTC")?.change??0,eth=coins.find((x:{symbol:string})=>x.symbol==="ETH")?.change??0,sol=coins.find((x:{symbol:string})=>x.symbol==="SOL")?.change??0,breadth=market.total3Change??0,event=(calendar.events??[]).find((x:{impact:string;utcMs:number})=>x.impact==="HIGH"&&x.utcMs>Date.now()),score=(btc*.45+eth*.2+sol*.15+breadth*.2)/5,fomc=/FOMC|Federal Open Market/i.test(event?.title??"")||event?.category==="FED",input={market:{regime:score,expectations:score*.6,positioning:score-Math.min(1,Math.abs(btc-breadth)/5)*.75,policyPressure:fomc?0.74:0,surprise:fomc?-.35:score*.35,transmission:fomc?-.55:score*.7,btcStructure:score},dataQuality:1};const r=await fetch("/api/halver/decision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),cache:"no-store"});if(!r.ok)return;const d=await r.json();if(active)setState({bias:d.bias,score:d.bias==="BULLISH"?d.bullishProbability:d.bias==="BEARISH"?d.bearishProbability:50,decision:d.decision,risk:d.reversalRisk,thesis:d.thesisStatus,tradeability:d.tradeability})}catch{}};void load();const timer=window.setInterval(load,60000);return()=>{active=false;window.clearInterval(timer)}},[]);
 if(!state)return null;return <div style={{display:"none"}} data-halver-brain={JSON.stringify(state)}/>;
}
