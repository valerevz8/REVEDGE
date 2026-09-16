"use client";

import { useEffect, useMemo, useState } from "react";

type Result={phase:"PRE_EVENT"|"INITIAL_REACTION"|"ACCEPTANCE"|"TRANSMISSION";biasScore:number;bias:"BULLISH"|"BEARISH"|"NEUTRAL";bullishProbability:number;bearishProbability:number;reactionDirection:string;reactionState:string;reactionQuality:number|null;thesisStatus:string;tradeability:number|null;decision:"LONG"|"SHORT"|"WAIT"|"NO_TRADE"|"REVERSAL_WATCH";reversalRisk:"LOW"|"MEDIUM"|"HIGH";setupType:string;edgeQuality:string;trigger:string;invalidation:string;reactionRead:string;transmissionRead:string;warnings:string[];rationale:string[]};
type Payload={ok:boolean;mode:"PRE_EVENT"|"POST_EVENT";result:Result;observedAt:string;preset?:string|null;reaction?:{expectedMovePct?:number;expectedMoveSource?:string;reaction?:{initialMovePct?:number;initialMoveMultiple?:number;retracementPct?:number;reactionLevelHeld?:boolean;preEventLevelHeld?:boolean;followThroughPct?:number;volumeRatio?:number}}|null};
type Event={title:string;category:string;impact:"HIGH"|"MEDIUM";utcMs:number;wib:string;note:string};

const phaseLabel=(p:Result["phase"])=>p==="PRE_EVENT"?"PRE-EVENT":p==="INITIAL_REACTION"?"INITIAL REACTION":p==="ACCEPTANCE"?"ACCEPTANCE":"TRANSMISSION";
const tone=(b:Result["bias"]|Result["reversalRisk"])=>b==="BULLISH"?"var(--green)":b==="BEARISH"||b==="HIGH"?"var(--red)":b==="MEDIUM"?"var(--yellow)":"var(--muted)";
const pct=(n:number|null|undefined)=>n==null?"—":`${Math.round(n)}%`;

function selectCatalyst(events:Event[]):Event|undefined{
 const high=events.filter((x)=>x.impact==="HIGH"&&Number.isFinite(x.utcMs));
 if(!high.length)return undefined;
 const now=Date.now();
 const future=high.filter((x)=>x.utcMs>=now).sort((a,b)=>a.utcMs-b.utcMs);
 if(future[0])return future[0];
 return [...high].sort((a,b)=>Math.abs(a.utcMs-now)-Math.abs(b.utcMs-now))[0];
}
function eventType(title:string){
 const t=title.toUpperCase();
 if(t.includes("FOMC"))return "FOMC";
 if(t.includes("CPI"))return "CPI";
 if(t.includes("PPI"))return "PPI";
 if(t.includes("PCE"))return "PCE";
 if(t.includes("NFP")||t.includes("EMPLOYMENT SITUATION"))return "NFP";
 if(t.includes("JOLTS"))return "JOLTS";
 return "MACRO";
}

export default function HalverBrainLive(){
 const[state,setState]=useState<Payload|null>(null);const[event,setEvent]=useState<Event|null>(null);const[error,setError]=useState(false);
 useEffect(()=>{let active=true;const load=async()=>{try{
   const c=await fetch("/api/calendar",{cache:"no-store"});if(!c.ok)throw new Error("calendar");const calendar=await c.json();
   const catalyst=selectCatalyst(calendar.events??[]);if(!catalyst){setError(true);return}setEvent(catalyst);
   const type=eventType(catalyst.title);const qs=new URLSearchParams({eventMs:String(catalyst.utcMs),eventType:type});if(type==="FOMC")qs.set("preset","fomc-sep-2026");
   const r=await fetch(`/api/halver/live?${qs.toString()}`,{cache:"no-store"});if(!r.ok)throw new Error("engine");const d=await r.json();if(active&&d.ok){setState(d);setError(false)}}catch{if(active)setError(true)}};void load();const timer=window.setInterval(load,15000);return()=>{active=false;window.clearInterval(timer)}},[]);
 const result=state?.result;const reaction=state?.reaction?.reaction;const stage=useMemo(()=>result?.phase??"PRE_EVENT",[result?.phase]);const steps=["PRE_EVENT","INITIAL_REACTION","ACCEPTANCE","TRANSMISSION"] as const;const activeIndex=steps.indexOf(stage);const liveColor=result?tone(result.bias):"var(--muted)";
 if(!event&&!error)return null;
 return <section className="shell section" style={{paddingTop:8,paddingBottom:8}} aria-label="HALVER live catalyst reaction console"><style>{`.halver-live-console{border:1px solid var(--line);border-radius:20px;background:var(--panel);overflow:hidden}.halver-live-head{display:flex;justify-content:space-between;gap:20px;padding:17px 20px 14px;border-bottom:1px solid var(--line)}.halver-live-kicker{font-size:8px;font-weight:800;letter-spacing:.14em;color:var(--muted);text-transform:uppercase}.halver-live-head h3{margin:5px 0 0;font-family:Manrope,sans-serif;font-size:18px;letter-spacing:-.04em}.halver-live-status{text-align:right}.halver-live-status b{display:block;margin-top:5px;font-size:10px}.halver-live-body{padding:16px 20px}.halver-live-track{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:15px}.halver-live-step{position:relative;padding:9px 8px;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-align:center}.halver-live-step.active{border-color:color-mix(in srgb,var(--gold-soft) 60%,var(--line));color:var(--text);background:color-mix(in srgb,var(--panel) 92%,var(--gold-soft) 8%)}.halver-live-step.done{color:var(--gold-soft)}.halver-live-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:8px}.halver-live-box{border:1px solid var(--line);border-radius:13px;padding:12px}.halver-live-box span{display:block;font-size:7px;color:var(--muted);font-weight:800;letter-spacing:.12em;text-transform:uppercase}.halver-live-box strong{display:block;margin-top:6px;font-size:14px;letter-spacing:-.02em}.halver-live-box small{display:block;margin-top:5px;color:var(--muted);font-size:8px;line-height:1.45}.halver-live-probs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.halver-live-prob{border:1px solid var(--line);border-radius:13px;padding:11px}.halver-live-prob span{font-size:7px;color:var(--muted);letter-spacing:.1em;font-weight:800}.halver-live-prob b{display:block;margin-top:5px;font-size:16px}.halver-live-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}.halver-live-meta div{border:1px solid var(--line);border-radius:12px;padding:10px}.halver-live-meta span{display:block;font-size:7px;color:var(--muted);letter-spacing:.1em;font-weight:800}.halver-live-meta b{display:block;margin-top:5px;font-size:10px}.halver-live-note{margin-top:8px;border:1px solid var(--line);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--panel) 94%,var(--gold-soft) 6%)}.halver-live-note p{margin:5px 0 0;font-size:9px;line-height:1.5;color:var(--muted)}.halver-live-error{padding:14px 20px;color:var(--muted);font-size:9px}@media(max-width:800px){.halver-live-grid,.halver-live-meta{grid-template-columns:1fr}.halver-live-track{grid-template-columns:1fr 1fr}}`}</style>
   <div className="halver-live-console"><div className="halver-live-head"><div><div className="halver-live-kicker">HALVER REACTION ENGINE · LIVE</div><h3>{event?.title??"Catalyst Reaction Console"}</h3></div><div className="halver-live-status"><div className="halver-live-kicker">{event?.wib??"—"}</div><b style={{color:liveColor}}>{result?phaseLabel(result.phase):"CONNECTING"}</b></div></div>
   {error&&!result?<div className="halver-live-error">Live engine temporarily unavailable. The radar will retry automatically.</div>:<div className="halver-live-body"><div className="halver-live-track">{steps.map((s,i)=><div key={s} className={`halver-live-step ${i===activeIndex?"active":""} ${i<activeIndex?"done":""}`}>{phaseLabel(s)}</div>)}</div>
   <div className="halver-live-grid"><div><div className="halver-live-box"><span>THESIS</span><strong style={{color:liveColor}}>{result?.thesisStatus??"PENDING"}</strong><small>{result?.reactionRead??"Awaiting the catalyst. Pre-event bias is a hypothesis until price reacts."}</small></div><div className="halver-live-probs"><div className="halver-live-prob"><span>BULLISH REACTION</span><b style={{color:"var(--green)"}}>{pct(result?.bullishProbability)}</b></div><div className="halver-live-prob"><span>BEARISH REACTION</span><b style={{color:"var(--red)"}}>{pct(result?.bearishProbability)}</b></div></div></div><div><div className="halver-live-box"><span>DECISION</span><strong style={{color:result?tone(result.reversalRisk):"var(--muted)"}}>{result?.decision??"WAIT"}</strong><small>{result?.trigger??"Wait for the catalyst response and acceptance."}</small></div><div className="halver-live-box" style={{marginTop:8}}><span>TRANSMISSION</span><strong>{result?.transmissionRead??"Awaiting macro → liquidity → crypto transmission."}</strong></div></div></div>
   <div className="halver-live-meta"><div><span>REACTION QUALITY</span><b>{pct(result?.reactionQuality)}</b></div><div><span>TRADEABILITY</span><b>{pct(result?.tradeability)}</b></div><div><span>REVERSAL RISK</span><b style={{color:tone(result?.reversalRisk??"LOW")}}>{result?.reversalRisk??"LOW"}</b></div></div>
   {state?.mode==="POST_EVENT"&&<div className="halver-live-note"><div className="halver-live-kicker">EVENT RESPONSE</div><p>{reaction?.initialMovePct!=null?`Initial move ${reaction.initialMovePct>0?"+":""}${reaction.initialMovePct.toFixed(2)}% · ${Math.abs(reaction.initialMoveMultiple??0).toFixed(1)}× expected move · retracement ${Math.round(reaction.retracementPct??0)}%.`:"Reaction data is being collected."} {reaction?.reactionLevelHeld?"Reaction level held.":"Reaction level not yet confirmed."} {reaction?.preEventLevelHeld?"Pre-event structure held.":"Pre-event structure lost."}</p></div>}</div>}
   </div></section>;
}
