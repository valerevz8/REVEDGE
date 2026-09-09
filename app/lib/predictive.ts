export type RiskFlag = "NONE" | "LIQUIDITY_SWEEP" | "BREAKOUT_TRAP" | "MACRO_HEADWIND" | "EVENT_WHIPSAW";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type PredictiveLayer = {
  directionScore: number;
  executionScore: number;
  riskFlag: RiskFlag;
  riskLevel: RiskLevel;
  riskLabel: string;
  immediateRead: string;
  baseCase: string;
  riskCase: string;
  worstCase: string;
  confirmation: string[];
  invalidation: string[];
  why: string;
};

type EventLike = {
  tag?: string;
  direction?: "Risk-on" | "Risk-off" | "Neutral";
  bias?: string;
  regime?: string;
  impact?: number;
  confidence?: number;
  sourceCount?: number;
  corroboration?: number;
  urgency?: string;
  tradableSetup?: string;
  triggerRows?: { watch?: string; trigger?: string; invalidation?: string }[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function buildPredictiveLayer(event: EventLike): PredictiveLayer {
  const impact = Number(event.impact ?? 0);
  const sources = Number(event.sourceCount ?? 1);
  const confirmation = Number(event.confidence ?? 0);
  const direction = event.direction ?? "Neutral";
  const tag = String(event.tag ?? "CRYPTO");
  const rows = Array.isArray(event.triggerRows) ? event.triggerRows : [];

  const directionScore = clamp(
    52 + Math.max(0, impact - 7) * 7 + Math.max(0, sources - 1) * 5 + (direction === "Neutral" ? 0 : 10) + (confirmation >= 85 ? 5 : 0),
    55,
    93,
  );

  let riskFlag: RiskFlag = "NONE";
  let riskLevel: RiskLevel = "LOW";
  if (direction === "Risk-on" && (sources < 2 || confirmation < 82)) {
    riskFlag = "LIQUIDITY_SWEEP";
    riskLevel = "HIGH";
  } else if (direction === "Risk-on" && impact >= 8) {
    riskFlag = "EVENT_WHIPSAW";
    riskLevel = "MEDIUM";
  } else if (direction === "Risk-off" && tag === "MACRO") {
    riskFlag = "MACRO_HEADWIND";
    riskLevel = "MEDIUM";
  } else if (impact >= 8) {
    riskFlag = "EVENT_WHIPSAW";
    riskLevel = "MEDIUM";
  } else if (direction !== "Neutral") {
    riskFlag = "BREAKOUT_TRAP";
    riskLevel = "MEDIUM";
  }

  const executionScore = clamp(
    92 - (riskLevel === "HIGH" ? 28 : riskLevel === "MEDIUM" ? 15 : 5) - (event.regime === "Cautious" ? 7 : 0) + Math.min(8, Math.max(0, sources - 1) * 4),
    40,
    92,
  );

  const riskLabel = {
    NONE: "Tidak ada risiko eksekusi utama",
    LIQUIDITY_SWEEP: "Risiko liquidity sweep sebelum lanjut",
    BREAKOUT_TRAP: "Risiko breakout trap / fake move",
    MACRO_HEADWIND: "Risiko tekanan makro",
    EVENT_WHIPSAW: "Risiko whipsaw saat event",
  }[riskFlag];

  const baseCase = direction === "Risk-on"
    ? "BTC mempertahankan arah naik; ETH → SOL → breadth ikut mengonfirmasi."
    : direction === "Risk-off"
      ? "BTC tetap tertekan; ETH/SOL gagal mengimbangi dan risiko menyebar ke altcoin."
      : "Market tetap dua arah sampai BTC memberi konfirmasi yang jelas.";

  const riskCase = riskFlag === "LIQUIDITY_SWEEP"
    ? "BTC menyapu liquidity ke bawah dulu, lalu mencoba kembali ke arah bullish."
    : direction === "Risk-on"
      ? "Breakout gagal bertahan dan rotasi ke ETH/SOL tidak menyebar."
      : direction === "Risk-off"
        ? "BTC memantul tajam setelah flush; short yang telat bisa kena squeeze."
        : "Headline memicu gerakan cepat tetapi tidak mendapat follow-through.";

  const worstCase = direction === "Risk-on"
    ? "BTC kehilangan level breakout/support → long liquidation → ETH/SOL ikut melemah → breadth kontraksi."
    : direction === "Risk-off"
      ? "BTC kehilangan support penting → deleveraging bertambah → weakness melebar ke ETH/SOL/ALT."
      : "Volatilitas dua arah meningkat tanpa edge yang cukup untuk entry.";

  const confirmation = rows.slice(0, 3).map((row) => row.trigger).filter(Boolean) as string[];
  const invalidation = rows.slice(0, 3).map((row) => row.invalidation).filter(Boolean) as string[];

  const immediateRead = riskLevel === "HIGH"
    ? "WAIT — ARAH BULLISH, TAPI ENTRY BELUM AMAN"
    : direction === "Risk-on"
      ? "WAIT FOR CONFIRMATION"
      : direction === "Risk-off"
        ? "REDUCE RISK / WAIT FOR CONFIRMATION"
        : "NO EDGE — WAIT";

  return {
    directionScore,
    executionScore,
    riskFlag,
    riskLevel,
    riskLabel,
    immediateRead,
    baseCase,
    riskCase,
    worstCase,
    confirmation,
    invalidation,
    why: event.tradableSetup || "Arah harus dikonfirmasi harga; headline saja belum cukup menjadi setup.",
  };
}
