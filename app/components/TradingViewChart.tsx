"use client";

import { useState } from "react";

const symbols = [
  { label: "BTC", symbol: "BINANCE:BTCUSDT" },
  { label: "ETH", symbol: "BINANCE:ETHUSDT" },
  { label: "SOL", symbol: "BINANCE:SOLUSDT" },
];

function widgetUrl(symbol: string) {
  const params = new URLSearchParams({
    symbol,
    interval: "60",
    theme: "dark",
    style: "1",
    timezone: "Etc/UTC",
    locale: "en",
    hide_top_toolbar: "0",
    hide_side_toolbar: "0",
    hide_legend: "0",
    hide_volume: "0",
    withdateranges: "1",
    allow_symbol_change: "0",
    save_image: "0",
    calendar: "0",
    backgroundColor: "#0d0d0b",
    gridColor: "rgba(128,98,59,0.10)",
    support_host: "https://www.tradingview.com",
  });
  return `https://www.tradingview.com/widgetembed/?${params.toString()}`;
}

export default function TradingViewChart() {
  const [active, setActive] = useState(symbols[0]);

  return (
    <section className="shell section" id="charts">
      <div className="sectiontitle">
        <div><div className="label">Market view</div><h2>Charts</h2></div>
        <span className="sub">TradingView · live market view</span>
      </div>
      <div className="chartcard">
        <div className="charttabs">
          {symbols.map((item) => (
            <button key={item.label} type="button" className={`charttab ${active.label === item.label ? "active" : ""}`} onClick={() => setActive(item)}>{item.label}</button>
          ))}
        </div>
        <div className="chartwrap">
          <iframe
            key={active.symbol}
            title={`${active.label} TradingView chart`}
            src={widgetUrl(active.symbol)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="fullscreen"
          />
        </div>
      </div>
    </section>
  );
}
