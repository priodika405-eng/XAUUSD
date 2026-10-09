import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";
import type { Signal, SignalStatus } from "../engine/types";
import { fmtPrice, fmtTimeUTC, timeAgo } from "../lib/format";

interface Props {
  history: Signal[];
  clock: Date;
}

const STATUS_STYLE: Record<SignalStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "ACTIF", cls: "border-[#e8b94a]/30 bg-[#e8b94a]/10 text-[#f7d87c]" },
  TP1: { label: "TP1 ATTEINT", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  TP2: { label: "TP2 ATTEINT", cls: "border-emerald-400/40 bg-emerald-400/[0.16] text-emerald-200" },
  SL: { label: "STOP LOSS", cls: "border-red-400/30 bg-red-400/10 text-red-300" },
};

export default function SignalHistory({ history, clock }: Props) {
  return (
    <section className="panel fade-up p-4" style={{ animationDelay: "240ms" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={14} className="text-[#e8b94a]" />
          <span className="text-[12px] font-bold tracking-[0.16em] text-zinc-300">JOURNAL DES SIGNAUX</span>
        </div>
        <span className="mono text-[10px] text-zinc-500">{history.length} ÉMISSION{history.length > 1 ? "S" : ""}</span>
      </div>

      {history.length === 0 ? (
        <div className="flex h-[92px] items-center justify-center rounded-xl border border-dashed border-white/[0.08]">
          <p className="mono text-[11px] tracking-wide text-zinc-500">
            AUCUNE ÉMISSION — LE MOTEUR ATTEND UNE CONFLUENCE VALIDÉE PAR LES 4 VERROUS
          </p>
        </div>
      ) : (
        <div className="scroll-thin flex gap-3 overflow-x-auto pb-1">
          {history.map((s) => {
            const isBuy = s.direction === "BUY";
            const st = STATUS_STYLE[s.status];
            return (
              <article
                key={s.id}
                className={`min-w-[228px] shrink-0 rounded-xl border p-3 ${
                  isBuy ? "border-emerald-400/[0.14] bg-emerald-400/[0.03]" : "border-red-400/[0.14] bg-red-400/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 ${isBuy ? "text-emerald-300" : "text-red-300"}`}>
                    {isBuy ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="mono text-[13px] font-extrabold tracking-wide">{isBuy ? "ACHAT" : "VENTE"}</span>
                    <span className="mono rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">{s.timeframe}</span>
                  </div>
                  <span className={`mono rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${st.cls} ${s.status === "ACTIVE" ? "glow-pulse" : ""}`}>
                    {st.label}
                  </span>
                </div>
                <div className="mono mt-2 text-[17px] font-bold text-zinc-100">
                  {fmtPrice(s.entry)} <span className="text-[10px] font-medium text-zinc-500">USD</span>
                </div>
                <div className="mt-1 truncate text-[10.5px] text-zinc-500">{s.pattern}</div>
                <div className="mono mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[9.5px] text-zinc-600">
                  <span>{fmtTimeUTC(s.createdAt)} UTC · {timeAgo(s.createdAt, clock.getTime())}</span>
                  <span className="text-[#e8b94a]/80">{s.confidence}/100</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
