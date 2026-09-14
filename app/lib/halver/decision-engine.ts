export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
export type Decision = "LONG" | "SHORT" | "WAIT" | "NO_TRADE" | "REVERSAL_WATCH";
export type ReactionState = "UNRESOLVED" | "ACCEPTED" | "REJECTED" | "FAILED";
export type ThesisStatus = "PENDING" | "VALIDATED" | "WEAKENED" | "INVALIDATED";
export type Phase = "PRE_EVENT" | "INITIAL_REACTION" | "ACCEPTANCE" | "TRANSMISSION";

export interface CrossAsset { dxy:number; yields:number; nasdaq:number; eth:number; sol:number; total3:number; }
export interface HalverInput {
  market:{ regime:number; expectations:number; positioning:number; policyPressure:number; surprise:number; transmission:number; btcStructure:number };
  reaction?:{ initialMove:number; retracement:number; reactionLevelHeld:boolean; preEventLevelHeld:boolean; followThrough:number; volume:number; oiPositioning:number; crossAsset:CrossAsset };
  dataQuality?:number;
}
export interface HalverDecision {
  phase:Phase; biasScore:number; bias:Direction; bullishProbability:number; bearishProbability:number;
  reactionDirection:Direction; reactionState:ReactionState; reactionQuality:number|null; thesisStatus:ThesisStatus;
  tradeability:number|null; decision:Decision; reversalRisk:"LOW"|"MEDIUM"|"HIGH";
  setupType:"DIRECTIONAL"|"BREAKOUT"|"REVERSAL"|"NO_EDGE"; edgeQuality:"STRONG"|"MODERATE"|"WEAK";
  trigger:string; invalidation:string; reactionRead:string; transmissionRead:string; warnings:string[]; rationale:string[];
}

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const dir=(s:number):Direction=>s>=40?"BULLISH":s<=-40?"BEARISH":"NEUTRAL";
const quality=(s:number):HalverDecision["edgeQuality"]=>Math.abs(s)>=65?"STRONG":Math.abs(s)>=40?"MODERATE":"WEAK";

export function calculateBias(m:HalverInput["market"],dq=1){
  const raw=m.regime*15+m.expectations*15+m.positioning*15-m.policyPressure*15+m.surprise*15+m.transmission*15+m.btcStructure*10;
  const score=clamp(raw*clamp(dq,0,1),-100,100);
  const bull=clamp(50+score/2,0,100);
  return {score:Math.round(score),direction:dir(score),bullishProbability:Math.round(bull),bearishProbability:Math.round(100-bull)};
}

function initialDirection(move:number):Direction{return move>=0.3?"BULLISH":move<=-0.3?"BEARISH":"NEUTRAL";}
function confirmations(d:Direction,c:CrossAsset){
  if(d==="NEUTRAL") return 0;
  return [c.dxy,c.yields,c.nasdaq,c.eth,c.sol,c.total3].filter(v=>d==="BULLISH"?v>=0.35:v<=-0.35).length;
}
function reactionQuality(r:NonNullable<HalverInput["reaction"]>,d:Direction,state:ReactionState){
  if(d==="NEUTRAL") return 0;
  const accept=state==="ACCEPTED"?100:state==="REJECTED"?20:state==="FAILED"?0:50;
  const cross=confirmations(d,r.crossAsset);
  const macro=d==="BULLISH"?((r.crossAsset.dxy+r.crossAsset.yields+r.crossAsset.nasdaq)/3+1)*50:((-r.crossAsset.dxy-r.crossAsset.yields-r.crossAsset.nasdaq)/3+1)*50;
  const crossScore=cross/6*100;
  const volume=clamp(r.volume,0,1)*100;
  const oi=d==="BULLISH"?clamp((r.oiPositioning+1)/2,0,1)*100:clamp((-r.oiPositioning+1)/2,0,1)*100;
  const follow=d==="BULLISH"?clamp((r.followThrough+1)/2,0,1)*100:clamp((-r.followThrough+1)/2,0,1)*100;
  return Math.round(clamp(accept*.30+clamp(macro,0,100)*.20+crossScore*.20+volume*.10+oi*.10+follow*.10,0,100));
}

export function evaluateHalver(input:HalverInput):HalverDecision{
  const dq=clamp(input.dataQuality??1,0,1), b=calculateBias(input.market,dq), warnings:string[]=[], rationale:string[]=[], eq=quality(b.score);
  if(!input.reaction){
    const directional=b.direction!=="NEUTRAL";
    warnings.push(directional?"Pre-event directional edge detected, but price confirmation is still required.":"Directional edge is weak.");
    if(dq<.8) warnings.push("Partial data: confirmation confidence reduced.");
    rationale.push(`Pre-event ${b.direction.toLowerCase()} bias with ${b.bullishProbability}% bullish reaction probability.`);
    rationale.push(`Edge quality: ${eq.toLowerCase()}.`);
    return {phase:"PRE_EVENT",biasScore:b.score,bias:b.direction,bullishProbability:b.bullishProbability,bearishProbability:b.bearishProbability,reactionDirection:"NEUTRAL",reactionState:"UNRESOLVED",reactionQuality:null,thesisStatus:"PENDING",tradeability:null,decision:directional?(b.direction==="BULLISH"?"LONG":"SHORT"):"WAIT",reversalRisk:"LOW",setupType:directional?"DIRECTIONAL":"NO_EDGE",edgeQuality:eq,trigger:b.direction==="BULLISH"?"BTC reclaims and holds the catalyst level with cross-asset confirmation.":b.direction==="BEARISH"?"BTC loses the catalyst level with cross-asset confirmation.":"Wait for price and breadth to align.",invalidation:b.direction==="BULLISH"?"BTC loses the pre-event structure or macro transmission turns against risk.":b.direction==="BEARISH"?"BTC reclaims the pre-event structure or macro transmission turns supportive.":"No clean directional confirmation.",reactionRead:"Awaiting initial event response.",transmissionRead:"Awaiting macro → liquidity → crypto transmission.",warnings,rationale};
  }
  const r=input.reaction, rd=initialDirection(r.initialMove), mag=Math.abs(r.initialMove), cross=confirmations(rd,r.crossAsset);
  const failed=mag>=.7&&r.retracement>=.5&&!r.reactionLevelHeld, strong=failed&&r.retracement>=.75, accepted=mag>=.3&&r.reactionLevelHeld&&r.retracement<.5&&cross>=2;
  const state:ReactionState=failed?"FAILED":accepted?"ACCEPTED":rd!=="NEUTRAL"?"REJECTED":"UNRESOLVED";
  const rq=reactionQuality(r,rd,state), matches=rd===b.direction&&rd!=="NEUTRAL", opposite=rd!=="NEUTRAL"&&rd!==b.direction, lost=!r.preEventLevelHeld;
  let thesis:ThesisStatus="WEAKENED";
  if(state==="ACCEPTED"&&matches&&rq>=65) thesis="VALIDATED";
  if(state==="FAILED"&&matches) thesis="INVALIDATED";
  if(opposite&&(state==="ACCEPTED"||lost)) thesis="INVALIDATED";
  let risk:"LOW"|"MEDIUM"|"HIGH"="LOW";
  if(state==="FAILED"||strong||lost) risk="HIGH"; else if(state==="REJECTED"||opposite) risk="MEDIUM";
  if(state==="FAILED") warnings.push(`${rd==="BULLISH"?"Bullish":"Bearish"} initial reaction failed acceptance.`);
  if(strong) warnings.push("Strong reaction failure: retracement reached 75%+.");
  if(lost) warnings.push("Pre-event level lost: reversal risk elevated.");
  if(cross<2&&rd!=="NEUTRAL") warnings.push("Cross-asset confirmation is weak.");
  if(dq<.8) warnings.push("Partial data: confirmation confidence reduced.");
  const trade=Math.round(clamp(Math.max(0,rq-(dq<.8?10:0))*.55+Math.abs(b.score)*.25+(state==="ACCEPTED"?15:0)-(risk==="HIGH"?20:risk==="MEDIUM"?8:0),0,100));
  let decision:Decision="WAIT";
  if(state==="FAILED"&&matches) decision="REVERSAL_WATCH";
  else if(thesis==="INVALIDATED"&&opposite&&rq>=65&&trade>=65) decision=rd==="BULLISH"?"LONG":"SHORT";
  else if(thesis==="VALIDATED"&&trade>=80) decision=b.direction==="BULLISH"?"LONG":b.direction==="BEARISH"?"SHORT":"WAIT";
  else if(rq<45) decision="NO_TRADE";
  const setup=state==="FAILED"?"REVERSAL":state==="ACCEPTED"?"BREAKOUT":Math.abs(b.score)>=40?"DIRECTIONAL":"NO_EDGE";
  const phase:Phase=state==="ACCEPTED"||state==="FAILED"?"TRANSMISSION":"ACCEPTANCE";
  const reactionRead=state==="ACCEPTED"?`${rd} — confirmed acceptance. ${cross}/6 cross-asset confirmations.`:state==="FAILED"?`${rd} — initial response failed. Wick is not acceptance; reversal risk is ${risk.toLowerCase()}.`:state==="REJECTED"?`${rd} — initial response rejected. Wait for a clean reclaim/loss before acting.`:"Initial reaction unresolved.";
  const transmissionRead=cross>=4?"Macro and crypto transmission are aligned.":cross>=2?"Transmission is partial; confirmation is not broad enough for aggressive positioning.":"Transmission is weak or divergent.";
  rationale.push(`Pre-event bias: ${b.direction} ${b.score>=0?"+":""}${b.score}.`); rationale.push(`Initial reaction: ${rd} at ${r.initialMove.toFixed(2)}× expected move.`); rationale.push(`Acceptance: ${state}; reaction quality ${rq}/100.`); rationale.push(`Cross-asset confirmation: ${cross}/6.`);
  return {phase,biasScore:b.score,bias:b.direction,bullishProbability:b.bullishProbability,bearishProbability:b.bearishProbability,reactionDirection:rd,reactionState:state,reactionQuality:rq,thesisStatus:thesis,tradeability:trade,decision,reversalRisk:risk,setupType:setup,edgeQuality:quality(Math.max(Math.abs(b.score),rq-50)),trigger:state==="FAILED"?"Reclaim failure followed by acceptance below the failed reaction level.":state==="ACCEPTED"?"Hold the reaction level with broad cross-asset confirmation.":"Wait for acceptance or rejection of the catalyst level.",invalidation:state==="FAILED"?"Failed level is reclaimed and held with cross-asset confirmation.":"Reaction level and pre-event structure fail against the active thesis.",reactionRead,transmissionRead,warnings,rationale};
}
