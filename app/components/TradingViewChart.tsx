"use client";

import { useEffect, useRef, useState } from "react";

const symbols = [
  { label: "BTC", symbol: "BINANCE:BTCUSDT" },
  { label: "ETH", symbol: "BINANCE:ETHUSDT" },
  { label: "SOL", symbol: "BINANCE:SOLUSDT" },
];

export default function TradingViewChart() {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(symbols[0]);

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    root.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.width = "100%";
    widget.style.height = "100%";
    root.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      width: "100%",
      height: "100%",
      symbol: active.symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      backgroundColor: "#0d0d0b",
      gridColor: "rgba(128,98,59,0.10)",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      withdateranges: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      details: false,
      hotlist: false,
      studies: [],
      support_host: "https://www.tradingview.com",
    });

    root.appendChild(script);

    return () => {
      root.innerHTML = "";
    };
  }, [active]);

  return (
    <section className="shell section" id="charts">
      <div className="sectiontitle">
        <div>
          <div className="label">Market view</div>
          <h2>Charts</h2>
        </div>
        <span className="sub">TradingView · live market view</span>
      </div>

      <div className="chartcard">
        <div className="charttabs">
          {symbols.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`charttab ${active.label === item.label ? "active" : ""}`}
              onClick={() => setActive(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="chartwrap" ref={container} aria-label={`${active.label} TradingView chart`} />
      </div>
    </section>
  );
}
