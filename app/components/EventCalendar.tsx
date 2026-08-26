"use client";

import { useEffect, useMemo, useState } from "react";

type Event = {
  id: string; date: string; timeET: string; title: string;
  category: "MACRO" | "FED" | "LABOR"; impact: "HIGH" | "MEDIUM";
  source: string; note: string; wib: string; et: string; uk: string; utcMs: number;
};

type Filter = "ALL" | "HIGH" | "FED" | "MACRO";

function daysUntil(ms: number) { const diff = ms - Date.now(); if (diff <= 0) return "TODAY"; const d = Math.ceil(diff / 86400000); return d === 1 ? "1D" : `${d}D`; }
function keyOf(d: Date) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`; }
function monthTitle(d: Date) { return d.toLocaleDateString("en-US", { month:"long", year:"numeric", timeZone:"UTC" }); }
function impactForDay(events: Event[], date: string, filter: Filter) {
  const list = events.filter(e => e.date === date && (filter === "ALL" || filter === "HIGH" ? (filter === "ALL" ? true : e.impact === "HIGH") : e.category === filter));
  return { events:list, high:list.some(e=>e.impact==="HIGH"), medium:list.some(e=>e.impact==="MEDIUM") };
}
function intel(e: Event) {
  if (e.category === "FED") return { watch:"USD / yields → BTC → ETH/SOL breadth", prep:"Reduce leverage before the decision window. Do not pre-position purely on the headline.", long:"If already long: protect the position and tighten risk if BTC loses the pre-event range.", short:"If already short: avoid chasing the first flush; keep risk above the invalidation level.", action:e.impact === "HIGH" ? "WAIT — TRADE THE REACTION" : "MONITOR" };
  if (e.title.includes("CPI") || e.title.includes("PCE") || e.title.includes("PPI")) return { watch:"USD / Treasury yields → BTC reaction → ETH/SOL confirmation", prep:"Expect a fast first move. Have levels marked before the print and avoid blind entries.", long:"Protect longs if BTC loses support or yields spike; consider reducing size before the print.", short:"Hold only while BTC confirms weakness; avoid adding after an extended flush.", action:"WAIT — TRADE THE REACTION" };
  return { watch:"USD / yields → BTC → ETH/SOL → TOTAL3 breadth", prep:"Treat this as a risk checkpoint. Prepare levels, but let price confirm the surprise.", long:"Keep risk controlled; tighten SL only after structure confirms the move.", short:"Do not add size until BTC and breadth confirm continuation.", action:e.impact === "HIGH" ? "WATCH CLOSELY" : "MONITOR" };
}

export default function EventCalendar() {
  const [events,setEvents]=useState<Event[]>([]); const [filter,setFilter]=useState<Filter>("ALL"); const [loading,setLoading]=useState(true);
  const [cursor,setCursor]=useState(()=>{const d=new Date(); return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));});
  const [selectedDate,setSelectedDate]=useState(()=>keyOf(new Date()));
  useEffect(()=>{fetch("/api/calendar",{cache:"no-store"}).then(r=>r.json()).then(d=>setEvents(d.events??[])).catch(()=>setEvents([])).finally(()=>setLoading(false));},[]);
  const filtered=useMemo(()=>events.filter(e=>filter==="ALL"||filter==="HIGH"? (filter==="ALL"||e.impact==="HIGH") : e.category===filter),[events,filter]);
  const nextHigh=events.find(e=>e.impact==="HIGH"&&e.utcMs>=Date.now());
  const first=(cursor.getUTCDay()+6)%7; const days=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,0)).getUTCDate();
  const cells=Array.from({length:Math.ceil((first+days)/7)*7},(_,i)=>{const n=i-first; return n<0||n>=days?null:new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),n+1));});
  const selected=filtered.filter(e=>e.date===selectedDate); const selectedIntel=selected[0]?intel(selected[0]):null;
  const todayKey=keyOf(new Date());
  const changeMonth=(delta:number)=>{const d=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+delta,1));setCursor(d);setSelectedDate(keyOf(d));};
  const selectDay=(date:string)=>setSelectedDate(date);

  return <section className="shell section calendar-section" id="calendar">
    <style>{`
      .re-calendar{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#0c0c0b;box-shadow:0 18px 70px rgba(0,0,0,.2)}
      .re-calhead{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line)}
      .re-month{font-family:Manrope,sans-serif;font-size:27px;font-weight:800;letter-spacing:-.05em}
      .re-month small{display:block;font-family:Inter,sans-serif;font-size:9px;color:#77746d;letter-spacing:.12em;text-transform:uppercase;margin-top:5px;font-weight:700}
      .re-calnav{display:flex;gap:6px}.re-calnav button{width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:#141412;color:var(--text);cursor:pointer;font-size:16px}.re-calnav button:hover{border-color:#5b4730}
      .re-week{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--line)}.re-week div{padding:10px 8px;color:#77746d;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;text-align:center}
      .re-grid{display:grid;grid-template-columns:repeat(7,1fr)}
      .re-day{min-height:92px;padding:9px 8px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#0c0c0b;color:#77746d;text-align:left;cursor:pointer;position:relative}.re-day:nth-child(7n){border-right:0}.re-day:hover{background:#11110f}.re-day.out{opacity:.22;cursor:default}.re-day.selected{background:#16130f;box-shadow:inset 0 0 0 1px #5a452e}.re-day.today .re-num{background:var(--text);color:#090908}.re-num{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;margin-bottom:8px}.re-events{display:grid;gap:4px}.re-pill{height:5px;border-radius:99px;background:#24231f}.re-pill.high{background:var(--red)}.re-pill.medium{background:var(--yellow)}.re-dotlabel{display:flex;align-items:center;gap:5px;color:#9a958b;font-size:8px;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.re-dot{width:6px;height:6px;border-radius:50%;background:var(--yellow);flex:0 0 auto}.re-dot.high{background:var(--red)}
      .re-legend{display:flex;gap:16px;align-items:center;padding:12px 16px;border-top:1px solid var(--line);color:#77746d;font-size:9px}.re-legend span{display:flex;align-items:center;gap:6px}.re-legend i{display:block;width:8px;height:8px;border-radius:50%;background:var(--yellow)}.re-legend i.high{background:var(--red)}
      .re-detail{margin-top:14px;border:1px solid var(--line);border-radius:16px;background:#10100f;padding:20px}.re-detailtop{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.re-badge{font-size:9px;font-weight:800;letter-spacing:.08em;padding:6px 9px;border-radius:999px;border:1px solid #4b3d2b;color:var(--yellow);background:rgba(217,189,115,.06)}.re-badge.high{color:var(--red);border-color:#563535;background:rgba(231,125,125,.07)}.re-detail h3{font-family:Manrope,sans-serif;font-size:22px;margin:10px 0 7px;letter-spacing:-.04em}.re-detail p{margin:0;color:#9d988f;font-size:11px;line-height:1.6;max-width:720px}.re-times{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.re-time{border:1px solid var(--line);border-radius:10px;padding:10px;background:#0d0d0c}.re-time span{display:block;color:#77746d;font-size:8px;letter-spacing:.08em}.re-time b{display:block;margin-top:5px;font-size:11px}.re-intel{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin-top:12px}.re-box{border:1px solid var(--line);border-radius:10px;padding:13px;background:#0d0d0c}.re-box label{display:block;color:#77746d;font-size:8px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px}.re-box strong{display:block;font-size:11px;line-height:1.55}.re-action{border-left:3px solid var(--gold-soft);background:#12100d}.re-position{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.re-position>div{border:1px solid var(--line);border-radius:10px;padding:11px;background:#0d0d0c}.re-position span{display:block;color:#77746d;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}.re-position b{font-size:10px;line-height:1.5;display:block}
      @media(max-width:700px){.re-calhead{padding:15px}.re-month{font-size:22px}.re-day{min-height:70px;padding:7px 5px}.re-num{width:22px;height:22px;font-size:10px;margin-bottom:6px}.re-pill{height:4px}.re-dotlabel{display:none}.re-times,.re-intel,.re-position{grid-template-columns:1fr}.re-detail{padding:15px}.re-detail h3{font-size:18px}.re-week div{padding:8px 3px;font-size:8px}}
    `}</style>

    <div className="sectiontitle"><div><div className="label">Risk map · next 35 days</div><h2>Event Calendar</h2></div><span className="sub">{loading?"Loading official schedule…":`${events.length} scheduled events`}</span></div>
    {nextHigh&&<div className="calendar-next"><div><span className="label">NEXT HIGH-IMPACT EVENT</span><strong>{nextHigh.title}</strong><span>{nextHigh.wib} · {daysUntil(nextHigh.utcMs)}</span></div><div className="next-note">{nextHigh.note}</div></div>}
    <div className="calendar-tabs">{(["ALL","HIGH","FED","MACRO"] as const).map(tab=><button key={tab} className={`calendar-tab ${filter===tab?"active":""}`} onClick={()=>setFilter(tab)}>{tab==="HIGH"?"HIGH IMPACT":tab}</button>)}</div>

    <div className="re-calendar">
      <div className="re-calhead"><div className="re-month">{monthTitle(cursor)}<small>Click a date to inspect event intelligence</small></div><div className="re-calnav"><button onClick={()=>changeMonth(-1)} aria-label="Previous month">‹</button><button onClick={()=>{const d=new Date();setCursor(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)));setSelectedDate(todayKey);}} aria-label="Current month">●</button><button onClick={()=>changeMonth(1)} aria-label="Next month">›</button></div></div>
      <div className="re-week">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d=><div key={d}>{d}</div>)}</div>
      <div className="re-grid">{cells.map((date,i)=>{if(!date)return <div className="re-day out" key={`o-${i}`}/>; const key=keyOf(date); const info=impactForDay(events,key,filter); return <button key={key} className={`re-day ${key===selectedDate?"selected":""} ${key===todayKey?"today":""}`} onClick={()=>selectDay(key)}><span className="re-num">{date.getUTCDate()}</span><div className="re-events">{info.high&&<span className="re-pill high"/>}{!info.high&&info.medium&&<span className="re-pill medium"/>}{info.events.slice(0,2).map(e=><span className={`re-dotlabel`} key={e.id}><i className={`re-dot ${e.impact==="HIGH"?"high":""}`}/>{e.title}</span>)}{info.events.length>2&&<span className="re-dotlabel">+{info.events.length-2} more</span>}</div></button>})}</div>
      <div className="re-legend"><span><i className="high"/> HIGH IMPACT · RED</span><span><i/> CAUTION · YELLOW</span><span>Click any marked date for decision guidance.</span></div>
    </div>

    <div className="re-detail">
      <div className="re-detailtop"><div><div className="label">Event intelligence · {selectedDate}</div>{selected.length? <h3>{selected.length===1?selected[0].title:`${selected.length} events on this date`}</h3>:<h3>No scheduled event</h3>}<p>{selected.length?selected[0].note:"No verified catalyst is scheduled on this date. Normal market monitoring applies."}</p></div>{selected[0]&&<span className={`re-badge ${selected[0].impact=== "HIGH"?"high":""}`}>{selected[0].impact} IMPACT</span>}</div>
      {selected[0]&&<><div className="re-times"><div className="re-time"><span>WIB</span><b>{selected[0].wib.replace(/^.*?, /,"")}</b></div><div className="re-time"><span>U.S. · ET</span><b>{selected[0].et.replace(/^.*?, /,"")}</b></div><div className="re-time"><span>UK</span><b>{selected[0].uk.replace(/^.*?, /,"")}</b></div></div><div className="re-intel"><div className="re-box"><label>What to watch</label><strong>{selectedIntel?.watch}</strong></div><div className="re-box re-action"><label>Pre-event action</label><strong>{selectedIntel?.action}</strong><div style={{marginTop:7,color:"#9d988f",fontSize:10,lineHeight:1.5}}>{selectedIntel?.prep}</div></div></div><div className="re-position"><div><span>No position</span><b>Prepare levels; wait for reaction + confirmation.</b></div><div><span>Open long</span><b>{selectedIntel?.long}</b></div><div><span>Open short</span><b>{selectedIntel?.short}</b></div></div></>}
    </div>

    <div className="calendar-footer"><span>HIGH = decision-risk catalyst · MEDIUM = monitor</span><span>Schedules can change; verify against the official source before trading.</span></div>
  </section>;
}
