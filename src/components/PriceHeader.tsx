import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Coins, Database, Radio } from "lucide-react";
import type { EngineVerdict } from "../engine/types";
import type { MarketSnapshot } from "../engine/marketData";
import { fmtClockUTC, fmtPct, fmtPrice } from "../lib/format";

interface Props {
  snapshot: MarketSnapshot | null;
  verdict: EngineVerdict | null;
  clock: Date;
  loading: boolean;
}

export default function PriceHeader({ snapshot, verdict, clock, loading }: Props) {
  const price = verdict?.price ?? snapshot?.price ?? null;
  const prevRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price == null) return;
    const prev = prevRef.current;
    prevRef.current = price;
    if (prev != null && price !== prev) {
      setFlash(price > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
  }, [price]);

  const spark = useMemo(() => {
    if (!snapshot) return { points: "", up: true };
    const closes = snapshot.candles.filter((c) => c.isClosed).slice(-48).map((c) => c.close);
    if (closes.length < 2) return { points: "", up: true };
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const w = 130;
    const h = 36;
    const points = closes
      .map((c, i) => `${((i / (closes.length - 1)) * w).toFixed(1)},${(h - ((c - min) / Math.max(max - min, 1e-9)) * (h - 5) - 2).toFixed(1)}`)
      .join(" ");
    return { points, up: closes[closes.length - 1] >= closes[0] };
  }, [snapshot]);

  const change = snapshot?.change24h ?? null;
  const changeUp = (change ?? 0) >= 0;
  const trend = verdict?.trend ?? "NONE";

  return (
    <header className="relative z-10 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8b94a]/30 bg-gradient-to-br from-[#e8b94a]/15 to-transparent">
            <Coins size={20} className="text-[#e8b94a]" strokeWidth={1.8} />
            <span className="pulse-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#e8b94a]" />
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-[0.18em]">
              <span className="gold-text">AURUM</span>
              <span className="ml-2 text-[10px] font-medium tracking-[0.3em] text-zinc-500">XAU/USD</span>
            </div>
            <div className="label-tech mt-0.5">Moteur de signaux · 3 verrous actifs</div>
          </div>
        </div>

        <div className="hidden h-9 w-px bg-white/[0.07] sm:block" />

        {/* Prix temps réel */}
        <div className="flex items-center gap-4">
          {loading && price == null ? (
            <div className="skeleton h-9 w-40 rounded-lg" />
          ) : (
            <>
              <div className="leading-none">
                <div className="label-tech mb-1">OR SPOT · TEMPS RÉEL</div>
                <div
                  key={price}
                  className={`mono text-[26px] font-bold tracking-tight text-zinc-100 ${flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}`}
                >
                  {fmtPrice(price)}
                  <span className="ml-1.5 text-[11px] font-medium text-zinc-500">USD</span>
                </div>
              </div>
              <svg width="130" height="36" className="hidden md:block" aria-hidden>
                <polyline
                  points={spark.points}
                  fill="none"
                  stroke={spark.up ? "#2fbf8f" : "#f0564f"}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              </svg>
            </>
          )}
        </div>

        {/* Variation 24h + tendance */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
              changeUp ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300" : "border-red-400/20 bg-red-400/[0.07] text-red-300"
            }`}
          >
            {changeUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span className="mono text-[12px] font-semibold">{fmtPct(change)}</span>
            <span className="text-[10px] opacity-60">24h</span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
              trend === "BULLISH"
                ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                : trend === "BEARISH"
                  ? "border-red-400/20 bg-red-400/[0.07] text-red-300"
                  : "border-white/10 bg-white/[0.03] text-zinc-400"
            }`}
          >
            <Activity size={14} />
            <span className="mono text-[11px] font-semibold tracking-wide">
              {trend === "BULLISH" ? "TENDANCE HAUSSIÈRE" : trend === "BEARISH" ? "TENDANCE BAISSIÈRE" : "TENDANCE —"}
            </span>
          </div>
        </div>

        {/* Droite : flux + horloge */}
        <div className="ml-auto flex items-center gap-5">
          <div className="hidden text-right md:block">
            <div className="label-tech mb-0.5 flex items-center justify-end gap-1.5">
              <Database size={10} />
              FLUX MOTEUR
            </div>
            <div className="mono text-[12px] font-semibold text-zinc-300">
              {snapshot ? snapshot.providerLabel : "CONNEXION…"}
            </div>
          </div>
          <div className="hidden h-9 w-px bg-white/[0.07] md:block" />
          <div className="text-right">
            <div className="label-tech mb-0.5">Horloge UTC</div>
            <div className="mono text-[15px] font-bold tracking-wider text-[#e8b94a]">{fmtClockUTC(clock)}</div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1.5">
            <Radio size={12} className="glow-pulse text-emerald-300" />
            <span className="mono text-[10px] font-bold tracking-[0.2em] text-emerald-300">EN DIRECT</span>
          </div>
        </div>
      </div>
    </header>
  );
}
