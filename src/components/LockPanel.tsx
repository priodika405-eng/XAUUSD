import { Activity, Ban, CandlestickChart, CheckCircle2, Hourglass, ShieldCheck, Timer, XCircle } from "lucide-react";
import type { EngineVerdict, LockId, Timeframe } from "../engine/types";
import { FORBIDDEN_TIMEFRAMES } from "../engine/types";
import { getCandleClock } from "../engine/sessions";
import { fmtClockUTC, fmtHMSfromMs } from "../lib/format";
import Ring from "./Ring";

interface Props {
  verdict: EngineVerdict | null;
  timeframe: Timeframe;
  onSelect: (tf: string) => void;
  clock: Date;
}

const LOCK_ICONS: Record<LockId, React.ComponentType<{ size?: number; className?: string }>> = {
  CANDLE: CandlestickChart,
  TIMEFRAME: Timer,
  TREND: Activity,
};

const LOCK_ORDER: LockId[] = ["CANDLE", "TIMEFRAME", "TREND"];
const LOCK_FALLBACK = ["Clôture de bougie", "Unité de temps autorisée", "Filtre EMA 200"];

const TF_OPTIONS: Timeframe[] = ["M15", "M30", "H1", "H4"];

export default function LockPanel({ verdict, timeframe, onSelect, clock }: Props) {
  const cc = getCandleClock(timeframe, clock);
  const urgent = cc.msToClose < 10_000;
  const passedCount = verdict?.locks.filter((l) => l.passed).length ?? 0;

  return (
    <section className="panel scanlines fade-up flex flex-col p-5" style={{ animationDelay: "60ms" }}>
      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={17} className="text-[#e8b94a]" strokeWidth={2} />
          <h2 className="text-[13px] font-bold tracking-[0.16em] text-zinc-200">VERROUS DE SÉCURITÉ</h2>
        </div>
        <span
          className={`mono rounded-md border px-2 py-0.5 text-[11px] font-bold ${
            passedCount === 3
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-[#e8b94a]/25 bg-[#e8b94a]/10 text-[#e8b94a]"
          }`}
        >
          {passedCount}/3
        </span>
      </div>

      {/* Les 3 contrôles, exécutés dans l'ordre de priorité */}
      <div className="space-y-2.5">
        {LOCK_ORDER.map((id, i) => {
          const lock = verdict?.locks.find((l) => l.id === id);
          const Icon = LOCK_ICONS[id];
          const state: "pass" | "fail" | "wait" = lock ? (lock.passed ? "pass" : "fail") : "wait";
          return (
            <div
              key={id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500 ${
                state === "pass"
                  ? "border-emerald-400/[0.14] bg-emerald-400/[0.045]"
                  : state === "fail"
                    ? "border-red-400/[0.18] bg-red-400/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  state === "pass"
                    ? "border-emerald-400/25 text-emerald-300"
                    : state === "fail"
                      ? "border-red-400/30 text-red-300"
                      : "border-white/10 text-zinc-500"
                }`}
              >
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-zinc-200">
                    <span className="mono mr-1.5 text-[10px] text-zinc-500">0{i + 1}</span>
                    {lock?.label ?? LOCK_FALLBACK[i]}
                  </span>
                  {state === "pass" ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                  ) : state === "fail" ? (
                    <XCircle size={14} className="shrink-0 text-red-400" />
                  ) : (
                    <Hourglass size={13} className="shrink-0 animate-pulse text-zinc-600" />
                  )}
                </div>
                <p className={`mt-0.5 text-[10.5px] leading-snug ${state === "fail" ? "text-red-300/90" : "text-zinc-500"}`}>
                  {lock?.detail ?? "Initialisation du contrôle…"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="my-5 h-px bg-white/[0.06]" />

      {/* Unité de temps — M1 / M5 bannis */}
      <div className="label-tech mb-2.5">Unité de temps · M1/M5 interdits</div>
      <div className="grid grid-cols-3 gap-2">
        {TF_OPTIONS.map((tf) => (
          <button
            key={tf}
            onClick={() => onSelect(tf)}
            className={`mono rounded-lg border py-2 text-[12px] font-bold tracking-wider transition-all duration-300 ${
              timeframe === tf
                ? "border-[#e8b94a]/60 bg-[#e8b94a]/15 text-[#f7d87c] shadow-[0_0_18px_-4px_rgba(232,185,74,0.5)]"
                : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-[#e8b94a]/30 hover:text-zinc-200"
            }`}
          >
            {tf}
          </button>
        ))}
        {FORBIDDEN_TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onSelect(tf)}
            title="Interdit par le VERROU N°4"
            className="mono group relative flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-red-400/[0.15] bg-red-400/[0.04] py-2 text-[12px] font-bold tracking-wider text-red-300/40"
          >
            <Ban size={11} className="transition-transform duration-300 group-hover:scale-125" />
            <span className="line-through decoration-red-400/50">{tf}</span>
          </button>
        ))}
      </div>

      <div className="my-5 h-px bg-white/[0.06]" />

      {/* Clôture de la bougie en cours */}
      <div className="flex items-center gap-4">
        <Ring
          size={76}
          stroke={5}
          progress={1 - cc.progress}
          color={urgent ? "#f0564f" : "#e8b94a"}
        >
          <span className={`mono text-[13px] font-bold ${urgent ? "text-red-300" : "text-zinc-100"}`}>
            {fmtHMSfromMs(cc.msToClose)}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="label-tech mb-1">Clôture de la bougie {timeframe}</div>
          <p className="text-[11px] leading-snug text-zinc-500">
            {urgent ? (
              <span className="font-semibold text-red-300">Clôture imminente — préparation de l'analyse</span>
            ) : (
              "Le moteur attend la clôture officielle avant toute détection de figure."
            )}
          </p>
          <div className="mono mt-1.5 text-[10px] text-zinc-600">
            Dernière clôture <span className="text-zinc-400">{fmtClockUTC(new Date(cc.lastClose)).slice(0, 5)} UTC</span>
          </div>
        </div>
      </div>

      {/* Barre de progression de la bougie */}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? "bg-red-400" : "bg-gradient-to-r from-[#b8860b] to-[#f7d87c]"}`}
          style={{ width: `${cc.progress * 100}%` }}
        />
      </div>
    </section>
  );
}
