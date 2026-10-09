import { useRef, useState } from "react";
import { Ban, CandlestickChart } from "lucide-react";
import PriceHeader from "./components/PriceHeader";
import LockPanel from "./components/LockPanel";
import SignalPanel from "./components/SignalPanel";
import SessionTimeline from "./components/SessionTimeline";
import SignalHistory from "./components/SignalHistory";
import TradingViewChart from "./components/TradingViewChart";
import { useSignalEngine } from "./hooks/useSignalEngine";
import type { Timeframe } from "./engine/types";
import { FORBIDDEN_TIMEFRAMES } from "./engine/types";

const RULES_MARQUEE = [
  "RÈGLE N°1 — AUCUNE BOUGIE NON CLÔTURÉE ANALYSÉE",
  "RÈGLE N°2 — FILTRE EMA 200 : JAMAIS DE CONTRETENDANCE",
  "RÈGLE N°4 — UNITÉS M1 ET M5 INTERDITES",
  "UN SEUL CONTRÔLE ÉCHOUÉ ⇒ NO_SIGNAL",
];

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>("M15");
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const blockTimer = useRef<number>(0);
  const { snapshot, verdict, history, clock, loading } = useSignalEngine(timeframe);

  const requestTimeframe = (tf: string) => {
    if ((FORBIDDEN_TIMEFRAMES as readonly string[]).includes(tf)) {
      // VERROU N°4 — blocage côté moteur, sans exception possible.
      setBlockedMsg(`VERROU N°4 — ${tf} INTERDIT · SCAN REFUSÉ`);
      window.clearTimeout(blockTimer.current);
      blockTimer.current = window.setTimeout(() => setBlockedMsg(null), 3200);
      return;
    }
    setTimeframe(tf as Timeframe);
  };

  return (
    <div className="relative min-h-screen bg-[#07070a] text-zinc-200">
      {/* Décor de fond */}
      <div className="bg-grid pointer-events-none fixed inset-0" />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(1000px 480px at 12% -10%, rgba(232,185,74,0.10), transparent 62%), radial-gradient(900px 520px at 92% 112%, rgba(232,185,74,0.06), transparent 60%)",
        }}
      />

      <div className="relative">
        <PriceHeader snapshot={snapshot} verdict={verdict} clock={clock} loading={loading} />

        <main className="mx-auto max-w-[1680px] px-4 py-4 lg:px-6">
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[310px_minmax(0,1fr)_384px]">
            {/* Verrous — ordre mobile : 2 */}
            <div className="order-2 xl:order-1">
              <LockPanel verdict={verdict} timeframe={timeframe} onSelect={requestTimeframe} clock={clock} />
            </div>

            {/* Graphique TradingView + sessions */}
            <div className="order-3 flex min-w-0 flex-col gap-4 xl:order-2">
              <section className="panel fade-up flex h-[540px] flex-col overflow-hidden xl:h-auto xl:min-h-[560px] xl:flex-1" style={{ animationDelay: "0ms" }}>
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <CandlestickChart size={15} className="text-[#e8b94a]" />
                    <span className="text-[12px] font-bold tracking-[0.14em] text-zinc-300">OANDA : XAUUSD</span>
                    <span className="hidden text-[10.5px] text-zinc-500 sm:inline">— Or spot · TradingView</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono rounded-md border border-[#e8b94a]/25 bg-[#e8b94a]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#f7d87c]">
                      {timeframe}
                    </span>
                    <span className="mono rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                      UTC
                    </span>
                  </div>
                </div>
                <div className="relative min-h-[420px] flex-1">
                  <div className="scan-line pointer-events-none absolute left-0 z-10 h-[2px] w-full" />
                  <TradingViewChart timeframe={timeframe} />
                </div>
              </section>
              <SessionTimeline clock={clock} />
            </div>

            {/* Verdict — ordre mobile : 1 */}
            <div className="order-1 xl:order-3">
              <SignalPanel verdict={verdict} candles={snapshot?.candles ?? []} clock={clock} loading={loading} />
            </div>
          </div>

          <div className="mt-4">
            <SignalHistory history={history} clock={clock} />
          </div>

          {/* Ruban des règles inviolables */}
          <div className="mt-5 overflow-hidden border-y border-white/[0.06] py-2.5">
            <div className="marquee-track">
              {[0, 1].map((n) => (
                <span key={n} className="mono flex items-center text-[10px] tracking-[0.22em] text-zinc-600">
                  {RULES_MARQUEE.map((r, i) => (
                    <span key={i} className="flex items-center">
                      <span className="px-6">{r}</span>
                      <span className="text-[#e8b94a]/60">◆</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          <footer className="flex flex-col items-center gap-1.5 py-5 text-center">
            <p className="text-[10.5px] leading-relaxed text-zinc-600">
              AURUM — moteur d'analyse technique XAU/USD synchronisé sur les clôtures réelles. Les verrous de sécurité sont
              câblés dans le moteur et ne peuvent être désactivés par aucun paramètre.
            </p>
            <p className="text-[10px] text-zinc-700">
              Outil d'analyse automatisée — ne constitue pas un conseil en investissement. Le trading sur l'or comporte un
              risque élevé de perte en capital.
            </p>
          </footer>
        </main>
      </div>

      {/* Alerte de blocage M1 / M5 */}
      {blockedMsg && (
        <div key={blockedMsg} className="fade-up fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-red-400/40 bg-[#150a0b]/95 px-4 py-3 shadow-[0_24px_70px_-18px_rgba(240,86,79,0.55)] backdrop-blur">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/30 bg-red-400/10">
              <Ban size={17} className="text-red-400" />
            </div>
            <div>
              <div className="mono text-[11.5px] font-bold tracking-wider text-red-300">{blockedMsg}</div>
              <div className="mt-0.5 text-[10.5px] text-zinc-500">Aucun paramètre utilisateur ne peut désactiver cette sécurité.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
