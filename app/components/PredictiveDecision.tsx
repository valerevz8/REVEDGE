"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "./Preferences";

type Predictive={directionScore:number;executionScore:number;riskFlag:string;riskLevel:"LOW"|"MEDIUM"|"HIGH";riskLabel:string;immediateRead:string;baseCase:string;riskCase:string;worstCase:string;confirmation:string[];invalidation:string[];why:string};
type IntelEvent={title:string;direction:"Risk-on"|"Risk-off"|"Neutral";bias:string;regime:string;impact:number;lifecycle:string;predictive?:Predictive};
type Market={coins:{symbol:string;price:number;change:number}[];total3Change:number};

export default function PredictiveDecision(){
 const {language}=usePreferences();
 const id=language==="id";
 const [event,setEvent]=useState<IntelEvent|null>(null);
 const [market,setMarket]=useState<Market|null>(null);
 useEffect(()=>{let active=true;const load=async()=>{try{const[a,b]=await Promise.all([fetch("/api/intelligence"),fetch("/api/market")]);if(!a.ok||!b.ok)return;const[intel,md]=await Promise.all([a.json(),b.json()]);if(active){setEvent(intel.events?.[0]??null);setMarket(md)}}catch{}};void load();const timer=window.setInterval(load,60000);return()=>{active=false;window.clearInterval(timer)}},[]);
 const bias=event?.direction??"Neutral";
 const p=event?.predictive;
 const score=p?.directionScore??(bias==="Neutral"?50:72);
 const btc=market?.coins?.find(c=>c.symbol==="BTC")?.change??0;
 const breadth=market?.total3Change??0;
 const divergence=Math.abs(btc-breadth);
 const risk=divergence>=2.5?"HIGH":divergence>=1.5?"MEDIUM":"LOW";
 const structure=useMemo(()=>btc>0&&breadth>0?"BREADTH CONFIRMS":btc<0&&breadth<0?"BTC LEADS":"MIXED",[btc,breadth]);
 if(!event)return null;
 const action=bias==="Risk-on"?(risk==="HIGH"?"BULLISH, BUT ENTRY NOT YET SAFE":"CONFIRMATION REQUIRED"):bias==="Risk-off"?"BEARISH, BUT WAIT FOR REACTION":"MIXED — NO EDGE YET";
 return <section className="shell section" style={{paddingTop:18,paddingBottom:8}} aria-label="HALVER predictive radar">
  <div className="re-predictive">
   <div className="re-predictive-head"><div><div className="label">{id?"RADAR PREDIKSI":"PREDICTIVE RADAR"}</div><div className="muted">{id?"RADAR PRE-EVENT":"PRE-EVENT RADAR"}</div></div><div style={{textAlign:"right"}}><div className="label">MODEL STATE</div><b>{action}</b></div></div>
   <div className="re-predictive-grid">
    <div className="re-predictive-main">
     <div className="re-kicker">{id?"BIAS MARKET SAAT INI":"CURRENT BIAS"}</div>
     <div className="re-direction"><strong>{bias}</strong><div className="re-score"><b>{score}/100</b><span>{id?"ARAH MARKET":"DIRECTION"}</span></div></div>
     <div className="re-metrics"><div className="re-metric"><span>{id?"KELAYAKAN ENTRY":"EXECUTION"}</span><b>{p?.executionScore??"—"}</b></div><div className="re-metric"><span>{id?"STRUKTUR MARKET":"MARKET STRUCTURE"}</span><b>{structure}</b></div><div className="re-metric"><span>{id?"RISIKO LIKUIDITAS":"LIQUIDITY RISK"}</span><b>{risk}</b></div></div>
     <div className="re-catalyst"><span className="re-kicker">{id?"KATALIS BERIKUTNYA":"NEXT CATALYST"}</span><h3>{event.title}</h3><p>{event.regime}</p></div>
    </div>
    <div className="re-predictive-side">
     <div className="re-risk"><span className="re-kicker">{id?"RISIKO UTAMA":"RISK FLAG"}</span><strong>{p?.riskFlag??(risk==="HIGH"?"LIQUIDITY_SWEEP":"NONE")}</strong><small>{p?.riskLabel??"Price confirmation remains required."}</small></div>
     <div className="re-scenarios"><div className="re-scenario"><span>BASE CASE</span><b>{p?.baseCase??"BTC holds the move and breadth confirms."}</b></div><div className="re-scenario"><span>RISK CASE</span><b>{p?.riskCase??"Initial reaction fails to gain follow-through."}</b></div><div className="re-scenario worst"><span>WORST CASE</span><b>{p?.worstCase??"Breakout fails and liquidation accelerates."}</b></div></div>
     <div className="re-checks"><div className="re-check"><div className="re-kicker">CONFIRMATION</div><ul>{(p?.confirmation??["BTC holds key level","ETH / SOL confirm","TOTAL3 breadth expands"]).slice(0,3).map((x,i)=><li key={i}>{x}</li>)}</ul></div><div className="re-check"><div className="re-kicker">INVALIDATION</div><ul>{(p?.invalidation??["BTC loses key level","ETH / SOL lose confirmation","TOTAL3 breadth contracts"]).slice(0,3).map((x,i)=><li key={i}>{x}</li>)}</ul></div></div>
     <div className="re-action"><span className="re-kicker">ACTION NOW</span><strong>{p?.immediateRead??action}</strong><p>{p?.why??"Headline is an input. Price + breadth decide whether the bias becomes tradable."}</p></div>
    </div>
   </div>
  </div>
 </section>;
}
