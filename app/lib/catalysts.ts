export type CatalystCategory = "MACRO" | "FED" | "LABOR";
export type CatalystScenario = { label: string; condition: string; marketPath: string; bias: "Risk-on" | "Risk-off" | "Neutral" };

export type ScheduledCatalyst = {
  id: string;
  date: string;
  timeET: string;
  title: string;
  category: CatalystCategory;
  impact: "HIGH" | "MEDIUM";
  source: string;
  note: string;
  scenarios: CatalystScenario[];
};

// Conservative scheduled catalyst registry. Dates/times come from official U.S. releases.
// The registry describes market sensitivity, not a prediction of the data itself.
export const SCHEDULED_CATALYSTS: ScheduledCatalyst[] = [
  {
    id: "jolts-2026-09-01", date: "2026-09-01", timeET: "10:00", title: "JOLTS Job Openings", category: "LABOR", impact: "MEDIUM", source: "BLS",
    note: "Labor-demand signal; a large surprise can shift rate expectations.",
    scenarios: [
      { label: "WEAKER", condition: "Material downside surprise", marketPath: "Lower rate pressure → softer USD/yields → risk appetite improves", bias: "Risk-on" },
      { label: "IN LINE", condition: "Close to consensus", marketPath: "Limited repricing → trade the existing BTC structure", bias: "Neutral" },
      { label: "STRONGER", condition: "Material upside surprise", marketPath: "Higher rate pressure → USD/yields firm → crypto risk weakens", bias: "Risk-off" },
    ],
  },
  {
    id: "nfp-2026-09-04", date: "2026-09-04", timeET: "08:30", title: "Employment Situation / NFP", category: "LABOR", impact: "HIGH", source: "BLS",
    note: "Major labor-market catalyst for USD, yields and risk assets.",
    scenarios: [
      { label: "WEAKER", condition: "Labor materially softer than expected", marketPath: "Rate-cut expectations rise → USD/yields ease → risk-on", bias: "Risk-on" },
      { label: "IN LINE", condition: "Near expectations", marketPath: "Limited macro repricing → price structure leads", bias: "Neutral" },
      { label: "STRONGER", condition: "Labor materially hotter than expected", marketPath: "Rate pressure rises → USD/yields firm → risk-off", bias: "Risk-off" },
    ],
  },
  {
    id: "ppi-2026-09-10", date: "2026-09-10", timeET: "08:30", title: "PPI — August", category: "MACRO", impact: "HIGH", source: "BLS",
    note: "Inflation input ahead of CPI and FOMC; watch USD/yields first, then BTC.",
    scenarios: [
      { label: "SOFTER", condition: "Inflation pressure below expectations", marketPath: "Lower rate pressure → USD/yields ease → risk-on", bias: "Risk-on" },
      { label: "IN LINE", condition: "Close to expectations", marketPath: "Headline becomes secondary → BTC structure decides", bias: "Neutral" },
      { label: "HOTTER", condition: "Inflation pressure above expectations", marketPath: "Higher rate pressure → USD/yields firm → risk-off", bias: "Risk-off" },
    ],
  },
  {
    id: "cpi-2026-09-11", date: "2026-09-11", timeET: "08:30", title: "CPI — August", category: "MACRO", impact: "HIGH", source: "BLS",
    note: "Primary inflation catalyst. The surprise can rapidly reprice Fed expectations and risk appetite.",
    scenarios: [
      { label: "SOFTER", condition: "Headline/core materially below expectations", marketPath: "USD/yields ease → Nasdaq strengthens → BTC upside confirmation", bias: "Risk-on" },
      { label: "IN LINE", condition: "Headline/core broadly match expectations", marketPath: "Limited macro surprise → positioning + BTC reaction decide", bias: "Neutral" },
      { label: "HOTTER", condition: "Headline/core materially above expectations", marketPath: "USD/yields rise → risk appetite weakens → BTC downside risk", bias: "Risk-off" },
    ],
  },
  {
    id: "fomc-2026-09-15", date: "2026-09-15", timeET: "—", title: "FOMC Meeting — Day 1", category: "FED", impact: "HIGH", source: "Federal Reserve",
    note: "Policy meeting begins. Treat the surrounding session as elevated-risk; no decision is implied on Day 1.",
    scenarios: [
      { label: "DOVISH", condition: "Communication shifts easier", marketPath: "Lower rate expectations → weaker USD/yields → risk-on", bias: "Risk-on" },
      { label: "UNCHANGED", condition: "Policy path broadly unchanged", marketPath: "Existing positioning and BTC structure lead", bias: "Neutral" },
      { label: "HAWKISH", condition: "Communication shifts tighter", marketPath: "Higher rate pressure → stronger USD/yields → risk-off", bias: "Risk-off" },
    ],
  },
  {
    id: "fomc-2026-09-16", date: "2026-09-16", timeET: "14:00", title: "FOMC Decision + Press Conference", category: "FED", impact: "HIGH", source: "Federal Reserve",
    note: "Rate decision and press conference. The reaction window can remain elevated after the first move.",
    scenarios: [
      { label: "DOVISH", condition: "Decision/guidance easier than priced", marketPath: "USD/yields ease → risk-on → BTC confirmation", bias: "Risk-on" },
      { label: "IN LINE", condition: "Decision/guidance close to priced", marketPath: "Reaction depends on positioning and press conference", bias: "Neutral" },
      { label: "HAWKISH", condition: "Decision/guidance tighter than priced", marketPath: "USD/yields firm → risk-off → BTC downside risk", bias: "Risk-off" },
    ],
  },
  {
    id: "trade-2026-09-03", date: "2026-09-03", timeET: "08:30", title: "U.S. Trade Balance", category: "MACRO", impact: "MEDIUM", source: "BEA",
    note: "Secondary macro flow data; crypto impact is usually conditional on the size of the surprise.",
    scenarios: [
      { label: "BENIGN", condition: "No meaningful surprise", marketPath: "Low repricing → existing structure leads", bias: "Neutral" },
      { label: "RISK-ON", condition: "Market interprets surprise as supportive", marketPath: "USD/yields ease → risk appetite improves", bias: "Risk-on" },
      { label: "RISK-OFF", condition: "Market reprices USD/yields materially higher", marketPath: "Liquidity tightens → crypto risk weakens", bias: "Risk-off" },
    ],
  },
  {
    id: "pce-2026-09-30", date: "2026-09-30", timeET: "08:30", title: "PCE / Personal Income & Outlays — August", category: "MACRO", impact: "HIGH", source: "BEA",
    note: "Core PCE is a major Fed-sensitive inflation signal. Watch USD/yields first, then BTC breadth.",
    scenarios: [
      { label: "SOFTER", condition: "Core inflation below expectations", marketPath: "Lower rate pressure → USD/yields ease → risk-on", bias: "Risk-on" },
      { label: "IN LINE", condition: "Near expectations", marketPath: "Limited surprise → price structure leads", bias: "Neutral" },
      { label: "HOTTER", condition: "Core inflation above expectations", marketPath: "Higher rate pressure → USD/yields firm → risk-off", bias: "Risk-off" },
    ],
  },
];

export function catalystUtcMs(catalyst: ScheduledCatalyst) {
  if (catalyst.timeET === "—") {
    return Date.UTC(Number(catalyst.date.slice(0, 4)), Number(catalyst.date.slice(5, 7)) - 1, Number(catalyst.date.slice(8, 10)), 12, 0);
  }
  // All currently registered dates are in EDT (UTC-4). Keep the conversion explicit and conservative.
  const [hour, minute] = catalyst.timeET.split(":").map(Number);
  return Date.UTC(Number(catalyst.date.slice(0, 4)), Number(catalyst.date.slice(5, 7)) - 1, Number(catalyst.date.slice(8, 10)), hour + 4, minute);
}

export function catalystPhase(utcMs: number, now = Date.now()) {
  const hours = (utcMs - now) / 3600000;
  if (hours > 0) return "PRE-EVENT" as const;
  if (hours >= -0.25) return "LIVE" as const;
  if (hours >= -2) return "POST-EVENT" as const;
  return "RESOLVED" as const;
}

export function countdownLabel(utcMs: number, now = Date.now()) {
  const diff = Math.abs(utcMs - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (diff < 3600000) return `${m}m`;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}
