"use client";

import { useEffect } from "react";

const ID: Record<string, string> = {
  "Market view": "Tampilan market",
  "Charts": "Grafik",
  "Chart": "Grafik",
  "TradingView · live market view": "TradingView · tampilan market live",
  "LIVE · refreshed 60s": "LIVE · diperbarui 60 dtk",
  "LIVE · 15s": "LIVE · 15 dtk",
  "● LIVE · 15s": "● LIVE · 15 dtk",
  "Google News · Macro": "Google News · Makro",
  "HIGH IMPACT · WATCH": "DAMPAK TINGGI · PANTAU",
  "BTC CATALYST → BREAKOUT NEEDS FOLLOW-THROUGH": "KATALIS BTC → BREAKOUT BUTUH KONFIRMASI LANJUTAN",
  "BTC CATALYST → BREAKOUT STRUCTURE UNDER PRESSURE": "KATALIS BTC → STRUKTUR BREAKOUT MULAI TERTEKAN",
  "MACRO CATALYST → BTC MUST CONFIRM BEFORE RISK EXPANDS": "KATALIS MAKRO → BTC HARUS KONFIRMASI SEBELUM RISIKO DITAMBAH",
  "MACRO SHOCK → BTC UPSIDE NOW NEEDS ABSORPTION": "GEJOLAK MAKRO → KENAIKAN BTC BUTUH PENYERAPAN",
  "ETH CATALYST → ALT ROTATION NEEDS CONFIRMATION": "KATALIS ETH → ROTASI ALTCOIN BUTUH KONFIRMASI",
  "ETH CATALYST → ALT RISK REMAINS VULNERABLE": "KATALIS ETH → RISIKO ALTCOIN MASIH RENTAN",
  "HIGH-BETA CATALYST → SOL / MEME ROTATION IN PLAY": "KATALIS HIGH-BETA → ROTASI SOL / MEME MULAI BERMAIN",
  "HIGH-BETA SHOCK → SOL / MEME RISK STAYS FRAGILE": "GEJOLAK HIGH-BETA → RISIKO SOL / MEME MASIH RAPUH",
  "CRYPTO CATALYST → PRICE CONFIRMATION IS THE TRADE": "KATALIS CRYPTO → YANG DITRADE ADALAH KONFIRMASI HARGA",
  "CRYPTO CATALYST → RISK REPRICING TAKES PRIORITY": "KATALIS CRYPTO → PERUBAHAN HARGA RISIKO JADI PRIORITAS",
  "PCE → BTC REACTION NOW SETS THE NEXT MOVE": "PCE → REAKSI BTC SEKARANG MENENTUKAN GERAKAN BERIKUTNYA",
  "HOTTER PCE → BTC UPSIDE FACES MACRO HEADWIND": "PCE LEBIH PANAS → KENAIKAN BTC MENGHADAPI TEKANAN MAKRO",
  "Risk-On": "Risk-on",
  "Risk-off": "Risk-off",
  "Neutral": "Netral",
  "Mixed": "Campuran",
  "Cautious": "Waspada",
  "Bullish": "Bullish",
  "Bearish": "Bearish",
  "Wait for confirmation": "Tunggu konfirmasi",
  "old": "lalu",
  "hours ago": "jam lalu",
  "days ago": "hari lalu",
  "seconds ago": "detik lalu",
  "minutes ago": "menit lalu",
  "Stay flat until BTC stabilizes and breadth confirms.": "Tetap tanpa posisi sampai BTC stabil dan breadth mengonfirmasi.",
  "Protect the long: tighten SL / reduce size if BTC loses support or breadth contracts.": "Lindungi posisi long: perketat SL atau kurangi ukuran posisi kalau BTC kehilangan support atau breadth menyempit.",
  "Keep the short only while BTC stays below the key level and SOL/ALT weakness persists; avoid chasing a flush.": "Pertahankan short hanya selama BTC di bawah level penting dan SOL/ALT tetap lemah; jangan mengejar flush.",
  "Prepare, but wait for BTC → ETH → SOL confirmation before entering.": "Siapkan levelnya, tapi tunggu konfirmasi BTC → ETH → SOL sebelum entry.",
  "Hold if BTC keeps the reclaim and breadth expands; trail risk under the invalidation level.": "Pertahankan posisi kalau BTC tetap di atas level reclaim dan breadth melebar; geser risiko di bawah level invalidasi.",
  "Reduce the short if BTC reclaims and ETH/SOL confirm; a squeeze can accelerate.": "Kurangi short kalau BTC reclaim dan ETH/SOL ikut mengonfirmasi; squeeze bisa bergerak sangat cepat.",
  "Wait for price confirmation; the headline alone is not a setup.": "Tunggu konfirmasi harga; headline saja bukan setup trading.",
  "Keep risk controlled and move SL only after price confirms continuation.": "Jaga risiko tetap terkontrol dan geser SL hanya setelah harga mengonfirmasi kelanjutan gerakan.",
  "Do not add size until the downside is confirmed by BTC and breadth.": "Jangan menambah posisi sampai pelemahan benar-benar dikonfirmasi BTC dan breadth.",
  "BTC is the primary market driver and can transmit the catalyst into ETH, SOL and alts.": "BTC adalah penggerak utama market dan bisa meneruskan dampak event ke ETH, SOL, dan altcoin.",
  "A headline without price confirmation is information, not a setup.": "Headline tanpa konfirmasi harga hanyalah informasi, bukan setup trading.",
  "Follow-through and breadth decide whether the move is real.": "Follow-through dan breadth yang menentukan apakah gerakannya benar-benar valid.",
  "The trade is the reaction, not the headline itself.": "Yang ditradingkan adalah reaksinya, bukan headline-nya.",
  "Price and breadth confirmation determine whether it becomes actionable.": "Konfirmasi harga dan breadth yang menentukan apakah event ini layak ditradingkan.",
};

const pairs = Object.entries(ID).sort((a, b) => b[0].length - a[0].length);

function translateText(value: string, id: boolean) {
  if (!value.trim()) return value;
  if (!id) {
    let next = value;
    if (next.includes("Grafik")) next = next.replace(/Grafik/g, "Charts");
    for (const [en, translated] of pairs) next = next.split(translated).join(en);
    return next;
  }
  let next = value;
  for (const [en, translated] of pairs) next = next.split(en).join(translated);
  next = next.replace(/(\d+)h\s+old/g, "$1j lalu");
  next = next.replace(/(\d+)d\s+old/g, "$1h lalu");
  next = next.replace(/(\d+)m\s+old/g, "$1m lalu");
  next = next.replace(/(\d+)[–-](\d+)H/g, "$1–$2J");
  return next;
}

function run() {
  if (typeof document === "undefined") return;
  const id = document.documentElement.lang === "id";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest("script,style,svg")) continue;
    nodes.push(node as Text);
  }
  for (const textNode of nodes) {
    const current = textNode.nodeValue ?? "";
    const next = translateText(current, id);
    if (next !== current) textNode.nodeValue = next;
  }
}

export default function LanguageCompleteness() {
  useEffect(() => {
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
