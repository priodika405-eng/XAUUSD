import { useEffect, useRef } from "react";
import type { Timeframe } from "../engine/types";

const TV_INTERVAL: Record<Timeframe, string> = { M15: "15", M30: "30", H1: "60", H4: "240" };

/** Graphique TradingView temps réel — XAU/USD (OANDA). */
export default function TradingViewChart({ timeframe }: { timeframe: Timeframe }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    container.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval: TV_INTERVAL[timeframe],
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "fr",
      backgroundColor: "rgba(7, 7, 10, 1)",
      gridColor: "rgba(255, 255, 255, 0.05)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [timeframe]);

  return <div ref={ref} className="tradingview-widget-container h-full w-full overflow-hidden rounded-b-[18px]" />;
}
