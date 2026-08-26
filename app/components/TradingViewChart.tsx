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
    if (!container.current) return;

    container.current.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.width = "100%";
    widget.style.height = "100%";
    container.current.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: active.symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    container.current.appendChild(script);

    return () => {
      if (container.current) container.current.innerHTML = "";
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
              className={`charttab ${active.label === item.label ? "active" : ""}`}
              onClick={() => setActive(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="chartwrap" ref={container} />
      </div>
    </section>
  );
}
