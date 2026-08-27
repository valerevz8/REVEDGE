"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "id";
type Theme = "dark" | "light";

type PreferencesContextValue = {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const translations: Record<string, string> = {
  "High Impact": "Dampak Tinggi",
  "Event Calendar": "Kalender Event",
  "Market": "Market",
  "Charts": "Chart",
  "Sectors": "Sektor",
  "Pricing": "Harga",
  "Sign in": "Masuk",
  "Go Pro": "Go Pro",
  "Curated crypto intelligence": "Intelijen crypto terkurasi",
  "See what matters.": "Lihat apa yang penting.",
  "Before the noise.": "Sebelum kebisingan.",
  "Market-moving events, live market structure, and capital rotation — filtered down to what a trader actually needs to know.": "Event penggerak market, struktur market live, dan rotasi modal — disaring menjadi apa yang benar-benar perlu diketahui trader.",
  "Explore REVEDGE": "Jelajahi REVEDGE",
  "View Event Calendar": "Lihat Kalender Event",
  "Market Pulse": "Denyut Market",
  "LIVE": "LIVE",
  "Decision intelligence · Priority feed": "Decision intelligence · Feed prioritas",
  "High Impact · Priority feed": "Dampak Tinggi · Feed prioritas",
  "Why it matters": "Kenapa ini penting",
  "Immediate read": "Pembacaan langsung",
  "Event clock": "Jam Event",
  "Impact intelligence": "Intelijen Dampak",
  "Trader guidance": "Panduan Trader",
  "What to do": "Apa yang dilakukan",
  "What to watch · next few hours": "Yang perlu dipantau · beberapa jam ke depan",
  "Position-aware decision": "Keputusan berdasarkan posisi",
  "Final action": "Aksi akhir",
  "No position": "Tanpa posisi",
  "Open long": "Long terbuka",
  "Open short": "Short terbuka",
  "Impact window": "Jendela dampak",
  "Event age": "Usia event",
  "Confidence": "Keyakinan",
  "Market impact": "Dampak market",
  "Direction": "Arah",
  "Regime": "Regime",
  "Primary driver": "Penggerak utama",
  "Second-order": "Dampak lanjutan",
  "Event / alert time": "Waktu event / alert",
  "U.S. time": "Waktu AS",
  "UK time": "Waktu UK",
  "Market session": "Sesi market",
  "Alert age": "Usia alert",
  "Expected relevance": "Relevansi yang diharapkan",
  "What to watch": "Yang perlu dipantau",
  "Capital rotation": "Rotasi modal",
  "Top 3 Sectors": "3 Sektor Teratas",
  "Live · 30s · breadth + relative strength": "Live · 30 dtk · breadth + relative strength",
  "Loading live sector data…": "Memuat data sektor live…",
  "REVEDGE could not reach the market data provider. Retrying automatically.": "REVEDGE tidak dapat terhubung ke penyedia data market. Mencoba lagi otomatis.",
  "The market, personalized.": "Market yang dipersonalisasi.",
  "Watchlist intelligence, personalized impact, custom alerts, and deeper sector signals. Free stays public. Pro becomes yours.": "Intelijen watchlist, dampak yang dipersonalisasi, alert khusus, dan sinyal sektor yang lebih dalam. Free tetap publik. Pro menjadi milikmu.",
  "Explore Pro": "Jelajahi Pro",
  "A REVE ecosystem product": "Produk ekosistem REVE",
  "See what matters. Before the noise.": "Lihat apa yang penting. Sebelum kebisingan.",
  "Know the risk before it arrives": "Kenali risikonya sebelum datang",
  "See the dates.": "Lihat tanggalnya.",
  "Prepare before the volatility.": "Bersiap sebelum volatilitas.",
  "REVEDGE maps the next high-impact macro events so traders can reduce surprise, prepare positions, and know exactly when the market deserves extra attention.": "REVEDGE memetakan event makro berdampak tinggi berikutnya agar trader dapat mengurangi kejutan, menyiapkan posisi, dan tahu kapan market membutuhkan perhatian ekstra.",
  "Information → Preparation → Decision": "Informasi → Persiapan → Keputusan",
  "REVEDGE · EVENT CALENDAR": "REVEDGE · KALENDER EVENT",
  "Loading live intelligence…": "Memuat intelligence live…",
  "Live intelligence unavailable": "Intelligence live tidak tersedia",
  "PRE-EVENT WATCH · calendar synced": "PANTAUAN PRE-EVENT · kalender tersinkron",
  "WATCH CLOSELY": "PANTAU DEKAT",
  "MONITOR": "MONITOR",
  "WAIT — TRADE THE REACTION": "TUNGGU — TRADE REAKSINYA",
  "TIME TO EVENT": "WAKTU MENUJU EVENT",
  "Priority": "Prioritas",
  "Urgency": "Urgensi",
  "Category": "Kategori",
  "NO POSITION": "TANPA POSISI",
  "OPEN LONG": "OPEN LONG",
  "OPEN SHORT": "OPEN SHORT",
  "BREADTH": "BREADTH",
  "Leaders": "Leaders",
};

function translateDom(language: Language) {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest("script,style,svg")) continue;
    nodes.push(node as Text);
  }
  for (const textNode of nodes) {
    const original = textNode.nodeValue ?? "";
    const trimmed = original.trim();
    if (!trimmed) continue;
    const translated = language === "id" ? translations[trimmed] : Object.entries(translations).find(([, id]) => id === trimmed)?.[0];
    if (!translated || translated === trimmed) continue;
    textNode.nodeValue = original.replace(trimmed, translated);
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("revedge:language") as Language | null;
    const savedTheme = window.localStorage.getItem("revedge:theme") as Theme | null;
    if (savedLanguage === "en" || savedLanguage === "id") setLanguageState(savedLanguage);
    if (savedTheme === "dark" || savedTheme === "light") setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("revedge:language", language);
    window.localStorage.setItem("revedge:theme", theme);
    translateDom(language);
    const observer = new MutationObserver(() => translateDom(language));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language, theme]);

  const value = useMemo(() => ({
    language,
    theme,
    setLanguage: (next: Language) => setLanguageState(next),
    toggleLanguage: () => setLanguageState((current) => current === "en" ? "id" : "en"),
    toggleTheme: () => setThemeState((current) => current === "dark" ? "light" : "dark"),
  }), [language, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}

export function HeaderPreferences() {
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  return (
    <div className="pref-controls">
      <button className={`lang-toggle ${language === "en" ? "active" : ""}`} onClick={toggleLanguage} aria-label="Switch language">
        EN / ID
      </button>
      <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
        {theme === "dark" ? "☼" : "☾"}
      </button>
    </div>
  );
}
