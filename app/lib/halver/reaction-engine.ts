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

export function buildReactionWindow(
  klines: Kline[],
  expectedMovePct = 0.5,
  eventIndex = 5,
): ReactionWindow | null {
  if (!Array.isArray(klines) || klines.length < 2) return null;
  const ordered = [...klines].sort((a, b) => a.openTime - b.openTime);
  const pivot = Math.max(1, Math.min(eventIndex, ordered.length - 1));
  const baseline = safe(ordered[pivot - 1].close);
  if (baseline <= 0) return null;

  const postEvent = ordered.slice(pivot);
  if (!postEvent.length) return null;
  const initial = postEvent[Math.min(4, postEvent.length - 1)];
  const initialPrice = safe(initial.close, baseline);
  const initialMovePct = ((initialPrice - baseline) / baseline) * 100;
  const direction = Math.sign(initialMovePct);

  const high = Math.max(...postEvent.map((k) => safe(k.high, safe(k.close, baseline))));
  const low = Math.min(...postEvent.map((k) => safe(k.low, safe(k.close, baseline))));
  const reactionHighPct = ((high - baseline) / baseline) * 100;
  const reactionLowPct = ((low - baseline) / baseline) * 100;

  const extreme = direction >= 0 ? reactionHighPct : reactionLowPct;
  const retraceDistance = direction >= 0
    ? Math.max(0, extreme - initialMovePct)
    : Math.max(0, initialMovePct - extreme);
  const retracementPct = Math.abs(initialMovePct) > 0
    ? Math.min(1, retraceDistance / Math.abs(initialMovePct))
    : 0;

  const last = ordered[ordered.length - 1];
  const lastClose = safe(last.close, baseline);
  const followThroughPct = ((lastClose - initialPrice) / baseline) * 100;
  const reactionLevelHeld = direction === 0
    ? false
    : direction > 0 ? lastClose >= initialPrice : lastClose <= initialPrice;
  const preEventLevelHeld = direction === 0
    ? true
    : direction > 0 ? lastClose >= baseline : lastClose <= baseline;

  const preEventVolumes = ordered.slice(Math.max(0, pivot - 5), pivot).map((k) => safe(k.volume));
  const postVolumes = postEvent.map((k) => safe(k.volume));
  const baseVolume = preEventVolumes.reduce((a, b) => a + b, 0) / Math.max(1, preEventVolumes.length);
  const reactionVolume = postVolumes.reduce((a, b) => a + b, 0) / Math.max(1, postVolumes.length);
  const volumeRatio = baseVolume > 0 ? reactionVolume / baseVolume : 1;

  const expected = Math.max(0.1, Math.abs(expectedMovePct));
  const initialMoveMultiple = Math.abs(initialMovePct) / expected;

  return {
    baselinePrice: Number(baseline.toFixed(4)),
    initialPrice: Number(initialPrice.toFixed(4)),
    initialMovePct: Number(initialMovePct.toFixed(4)),
    initialMoveMultiple: Number(initialMoveMultiple.toFixed(3)),
    retracementPct: Number(retracementPct.toFixed(3)),
    reactionHighPct: Number(reactionHighPct.toFixed(4)),
    reactionLowPct: Number(reactionLowPct.toFixed(4)),
    reactionLevelHeld,
    preEventLevelHeld,
    followThroughPct: Number(followThroughPct.toFixed(4)),
    volumeRatio: Number(volumeRatio.toFixed(3)),
    observedMinutes: Math.max(0, Math.round((last.openTime - postEvent[0].openTime) / 60000)),
  };
}
