export type ReactionWindow = {
  baselinePrice: number;
  initialPrice: number;
  initialMovePct: number;
  initialMoveMultiple: number;
  retracementPct: number;
  reactionHighPct: number;
  reactionLowPct: number;
  reactionLevelHeld: boolean;
  preEventLevelHeld: boolean;
  followThroughPct: number;
  volumeRatio: number;
  observedMinutes: number;
};

export type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const safe = (n: number, fallback = 0) => Number.isFinite(n) ? n : fallback;

export function buildReactionWindow(klines: Kline[], expectedMovePct = 0.5): ReactionWindow | null {
  if (!Array.isArray(klines) || klines.length < 2) return null;
  const ordered = [...klines].sort((a, b) => a.openTime - b.openTime);
  const baseline = safe(ordered[0].close);
  if (baseline <= 0) return null;

  const initial = ordered[Math.min(4, ordered.length - 1)];
  const initialPrice = safe(initial.close, baseline);
  const initialMovePct = ((initialPrice - baseline) / baseline) * 100;
  const direction = Math.sign(initialMovePct);
  const relevant = ordered.slice(1);
  const high = Math.max(...relevant.map((k) => safe(k.high, safe(k.close, baseline))));
  const low = Math.min(...relevant.map((k) => safe(k.low, safe(k.close, baseline))));
  const reactionHighPct = ((high - baseline) / baseline) * 100;
  const reactionLowPct = ((low - baseline) / baseline) * 100;

  const extreme = direction >= 0 ? reactionHighPct : reactionLowPct;
  const retraceDistance = direction >= 0 ? Math.max(0, extreme - initialMovePct) : Math.max(0, initialMovePct - extreme);
  const retracementPct = Math.abs(initialMovePct) > 0 ? Math.min(1, retraceDistance / Math.abs(initialMovePct)) : 0;

  const last = ordered[ordered.length - 1];
  const followThroughPct = ((safe(last.close, baseline) - initialPrice) / baseline) * 100;
  const reactionLevelHeld = direction === 0 ? false : direction > 0 ? safe(last.close, baseline) >= initialPrice : safe(last.close, baseline) <= initialPrice;
  const preEventLevelHeld = direction === 0 ? true : direction > 0 ? safe(last.close, baseline) >= baseline : safe(last.close, baseline) <= baseline;

  const initialVolumes = ordered.slice(0, Math.min(5, ordered.length)).map((k) => safe(k.volume));
  const postVolumes = ordered.slice(Math.min(5, ordered.length)).map((k) => safe(k.volume));
  const baseVolume = initialVolumes.reduce((a, b) => a + b, 0) / Math.max(1, initialVolumes.length);
  const reactionVolume = postVolumes.reduce((a, b) => a + b, 0) / Math.max(1, postVolumes.length);
  const volumeRatio = baseVolume > 0 ? reactionVolume / baseVolume : 1;

  const expected = Math.max(0.1, Math.abs(expectedMovePct));
  const initialMoveMultiple = Math.abs(initialMovePct) / expected;

  return {
    baselinePrice: baseline,
    initialPrice,
    initialMovePct: Number(initialMovePct.toFixed(4)),
    initialMoveMultiple: Number(initialMoveMultiple.toFixed(3)),
    retracementPct: Number(retracementPct.toFixed(3)),
    reactionHighPct: Number(reactionHighPct.toFixed(4)),
    reactionLowPct: Number(reactionLowPct.toFixed(4)),
    reactionLevelHeld,
    preEventLevelHeld,
    followThroughPct: Number(followThroughPct.toFixed(4)),
    volumeRatio: Number(volumeRatio.toFixed(3)),
    observedMinutes: Math.max(0, Math.round((last.openTime - ordered[0].openTime) / 60000)),
  };
}
