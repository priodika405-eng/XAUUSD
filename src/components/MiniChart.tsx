import { useMemo } from "react";
import type { Candle } from "../engine/types";
import { emaSeries } from "../engine/indicators";

/** Miniature chandeliers (28 clôtures) + EMA 20 — données strictement clôturées. */
export default function MiniChart({ candles }: { candles: Candle[] }) {
  const model = useMemo(() => {
    const closed = candles.filter((c) => c.isClosed).slice(-28);
    if (closed.length < 5) return null;
    const W = 300;
    const H = 96;
    const padX = 4;
    const padY = 8;
    const min = Math.min(...closed.map((c) => c.low));
    const max = Math.max(...closed.map((c) => c.high));
    const span = Math.max(max - min, 1e-9);
    const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2);
    const cw = (W - padX * 2) / closed.length;

    const closes = closed.map((c) => c.close);
    const emaVals = emaSeries(closes, 20);
    let emaPath = "";
    emaVals.forEach((v, i) => {
      if (Number.isNaN(v)) return;
      const x = padX + i * cw + cw / 2;
      emaPath += `${emaPath ? " L" : "M"}${x.toFixed(1)} ${y(v).toFixed(1)}`;
    });

    return { closed, W, H, padX, cw, y, emaPath };
  }, [candles]);

  if (!model) {
    return <div className="skeleton h-[96px] w-full rounded-lg" />;
  }

  const { closed, W, H, padX, cw, y, emaPath } = model;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 96 }} preserveAspectRatio="none" aria-hidden>
      {emaPath && <path d={emaPath} fill="none" stroke="#e8b94a" strokeWidth="1.3" opacity="0.65" />}
      {closed.map((c, i) => {
        const x = padX + i * cw + cw / 2;
        const up = c.close >= c.open;
        const isLast = i === closed.length - 1;
        const stroke = isLast ? "#f7d87c" : up ? "#2fbf8f" : "#f0564f";
        const bodyY = y(Math.max(c.open, c.close));
        const bodyH = Math.max(Math.abs(y(c.open) - y(c.close)), 1.4);
        return (
          <g key={c.time} opacity={isLast ? 1 : 0.72}>
            <line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} stroke={stroke} strokeWidth={isLast ? 1.4 : 1} />
            <rect
              x={x - cw * 0.3}
              y={bodyY}
              width={cw * 0.6}
              height={bodyH}
              fill={stroke}
              rx={0.8}
              style={isLast ? { filter: "drop-shadow(0 0 6px rgba(247,216,124,0.7))" } : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
