import { Globe2 } from "lucide-react";
import { SESSION_SEGMENTS, getSessionInfo } from "../engine/sessions";

const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Repères de sessions sur 24h (UTC) — purement informatif, jamais bloquant. */
export default function SessionTimeline({ clock }: { clock: Date }) {
  const info = getSessionInfo(clock);
  const pos = (info.utcMinutes / 1440) * 100;

  return (
    <section className="panel fade-up p-4" style={{ animationDelay: "180ms" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 size={14} className="text-[#e8b94a]" />
          <span className="text-[12px] font-bold tracking-[0.16em] text-zinc-300">SESSIONS DE MARCHÉ · UTC</span>
          <span className="hidden text-[10px] text-zinc-600 sm:inline">— repères de liquidité, scan permanent</span>
        </div>
        <span
          className={`mono rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-widest ${
            info.liquidity === "HIGH"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-zinc-400"
          }`}
        >
          {info.liquidity === "HIGH" ? "LIQUIDITÉ ÉLEVÉE" : "LIQUIDITÉ RÉDUITE"}
        </span>
      </div>

      <div className="relative">
        <div className="flex h-12 overflow-hidden rounded-lg border border-white/[0.07]">
          {SESSION_SEGMENTS.map((seg) => {
            const width = ((seg.endMin - seg.startMin) / 1440) * 100;
            const active = info.utcMinutes >= seg.startMin && info.utcMinutes < seg.endMin;
            return (
              <div
                key={seg.id}
                className={`relative flex flex-col items-center justify-center border-r border-white/[0.06] last:border-r-0 ${
                  seg.major
                    ? active
                      ? "bg-[#e8b94a]/[0.16]"
                      : "bg-[#e8b94a]/[0.05]"
                    : "bg-white/[0.015]"
                }`}
                style={{ width: `${width}%` }}
              >
                <span
                  className={`mono truncate px-1 text-[9px] font-bold tracking-wider ${
                    seg.major ? (active ? "text-[#f7d87c]" : "text-[#e8b94a]/70") : "text-zinc-600"
                  }`}
                >
                  {seg.label.toUpperCase()}
                </span>
                <span className="mono text-[8.5px] text-zinc-600">
                  {hm(seg.startMin)}–{hm(seg.endMin)}
                </span>
                {active && <span className="absolute inset-0 border border-[#e8b94a]/40" style={{ borderRadius: 0 }} />}
              </div>
            );
          })}
        </div>

        {/* Curseur temps réel */}
        <div className="pointer-events-none absolute -top-1 h-14 w-px bg-[#f7d87c]" style={{ left: `calc(${pos}% - 0.5px)`, boxShadow: "0 0 10px rgba(247,216,124,0.8)" }}>
          <span className="absolute -left-[3.5px] -top-1 h-2 w-2 rounded-full bg-[#f7d87c]" />
        </div>
      </div>

      <div className="mono mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#e8b94a]" />Londres 07:00–16:00</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#e8b94a]" />New York 13:00–22:00</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />Asie · zone calme — scan maintenu</span>
        <span className="ml-auto text-zinc-400">{info.label}</span>
      </div>
    </section>
  );
}
