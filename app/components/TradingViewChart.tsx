"use client";

import { useEffect, useRef, useState } from "react";

const symbols = [
  { label: "BTC", symbol: "BINANCE:BTCUSDT" },
  { label: "ETH", symbol: "BINANCE:ETHUSDT" },
  { label: "SOL", symbol: "BINANCE:SOLUSDT" },
];

type TradingViewWindow = Window & {
  TradingView?: {
    widget: new (options: Record<string, unknown>) => unknown;
  };
};

export default function TradingViewChart() {
  const [active, setActive] = useState(symbols[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const mount = () => {
      const tv = (window as TradingViewWindow).TradingView;
      if (!tv || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      const holder = document.createElement("div");
      const holderId = `revedge-tv-${active.label.toLowerCase()}`;
      holder.id = holderId;
      holder.style.width = "100%";
      holder.style.height = "100%";
      containerRef.current.appendChild(holder);

      new tv.widget({
        autosize: true,
        symbol: active.symbol,
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        withdateranges: true,
        studies: [],
        backgroundColor: "#0d0d0b",
        gridColor: "rgba(128,98,59,0.10)",
        container_id: holderId,
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-revedge-tradingview="true"]');
    if (existing) {
      if ((window as TradingViewWindow).TradingView) mount();
      else existing.addEventListener("load", mount, { once: true });
      return () => existing.removeEventListener("load", mount);
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.dataset.revedgeTradingview = "true";
    script.addEventListener("load", mount, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener("load", mount);
  }, [active]);

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
          <div ref={containerRef} className="chartembed" />
        </div>
      </div>
    </section>
  );
}
