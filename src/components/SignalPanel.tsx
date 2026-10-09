import { ArrowDownRight, ArrowUpRight, Crosshair, ScanLine, ShieldAlert, ShieldCheck, Target, XOctagon } from "lucide-react";
import type { Candle, EngineVerdict } from "../engine/types";
import { fmtPrice, fmtSigned, fmtTimeUTC } from "../lib/format";
import MiniChart from "./MiniChart";
import Ring from "./Ring";

interface Props {
  verdict: EngineVerdict | null;
  candles: Candle[];
  clock: Date;
  loading: boolean;
}

export default function SignalPanel({ verdict, candles, loading }: Props) {
  const signal = verdict?.signal ?? null;
  const dir = signal?.direction ?? null;
  const isBuy = dir === "BUY";
  const accent = dir ? (isBuy ? "#2fbf8f" : "#f0564f") : "#e8b94a";

  const rsi = verdict?.rsi ?? null;
  const atr = verdict?.atr ?? null;
  const ema200 = verdict?.ema200 ?? null;
  const price = verdict?.price ?? null;
  const distEma = price != null && ema200 != null ? ((price - ema200) / ema200) * 100 : null;

  return (
    <section className="panel scanlines fade-up flex flex-col overflow-hidden p-5" style={{ animationDelay: "120ms" }}>
      {/* Filigrane vertical */}
      <div className="outline-word pointer-events-none absolute -right-1 top-16 select-none font-bold leading-none tracking-tighter" style={{ writingMode: "vertical-rl", fontSize: 90 }}>
        XAU·USD
      </div>

      {/* En-tête */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Crosshair size={16} className="text-[#e8b94a]" strokeWidth={2} />
          <h2 className="text-[13px] font-bold tracking-[0.16em] text-zinc-200">VERDICT DU MOTEUR</h2>
        </div>
        {verdict && (
          <span className="mono text-[10px] text-zinc-500">
            ANALYSÉ {fmtTimeUTC(verdict.analyzedAt)} UTC
          </span>
        )}
      </div>

      {/* Zone de verdict + radar */}
      <div className="relative flex min-h-[158px] flex-col justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#08080c] px-4 py-4">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#e8b94a]/[0.07]" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-[#e8b94a]/[0.09]" />
        <div className="radar-sweep pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" />
        <div className="scan-line pointer-events-none absolute left-0 h-[2px] w-full" />

        {loading && !verdict ? (
          <div className="space-y-2.5">
            <div className="skeleton h-8 w-52 rounded-md" />
            <div className="skeleton h-3 w-72 max-w-full rounded-md" />
          </div>
        ) : verdict?.code === "SIGNAL" && signal ? (
          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div
                className={`mono inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.25em] ${
                  isBuy ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300"
                }`}
              >
                {isBuy ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                SIGNAL {isBuy ? "ACHAT" : "VENTE"} · {signal.timeframe}
              </div>
              <div
                className={`mono mt-1.5 text-[42px] font-extrabold leading-none tracking-tight ${
                  isBuy ? "text-emerald-300" : "text-red-300"
                }`}
                style={{ textShadow: `0 0 34px ${isBuy ? "rgba(47,191,143,0.45)" : "rgba(240,86,79,0.45)"}` }}
              >
                {isBuy ? "ACHAT" : "VENTE"}
              </div>
              <div className="mono mt-1 text-[11px] text-zinc-400">
                @ <span className="font-bold text-zinc-100">{fmtPrice(signal.entry)}</span> USD · {signal.pattern}
              </div>
            </div>
            <Ring size={84} stroke={6} progress={signal.confidence / 100} color={accent}>
              <div className="text-center leading-none">
                <div className="mono text-[19px] font-extrabold text-zinc-100">{signal.confidence}</div>
                <div className="label-tech mt-1" style={{ fontSize: 8 }}>CONFLUENCE</div>
              </div>
            </Ring>
          </div>
        ) : verdict?.rejected ? (
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/[0.08]">
              <ShieldAlert size={26} className="text-red-400" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="mono text-[24px] font-extrabold tracking-tight text-red-300" style={{ textShadow: "0 0 26px rgba(240,86,79,0.4)" }}>
                SIGNAL REJETÉ
              </div>
              <div className="mono mt-0.5 text-[10px] tracking-[0.2em] text-red-400/70">CONTRESENS EMA 200 · VERROU N°2</div>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#e8b94a]/25 bg-[#e8b94a]/[0.06]">
              <ScanLine size={26} className="glow-pulse text-[#e8b94a]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="mono text-[24px] font-extrabold tracking-tight text-zinc-300">EN VEILLE</div>
              <div className="mono mt-0.5 text-[10px] tracking-[0.2em] text-zinc-500">SCAN DES CLÔTURES EN COURS</div>
            </div>
          </div>
        )}
      </div>

      {/* Raison du verdict */}
      <p className={`mt-3 text-[11.5px] leading-relaxed ${verdict?.rejected ? "text-red-300/90" : "text-zinc-400"}`}>
        {verdict?.reason ?? "Connexion au flux de données et calibration du moteur…"}
      </p>

      {/* Niveaux du signal */}
      {signal && (
        <div className="mt-4 space-y-1.5">
          <Level label="ENTRÉE" value={fmtPrice(signal.entry)} sub="clôture validée" icon={<Target size={13} />} tone="gold" />
          <Level
            label="STOP LOSS"
            value={fmtPrice(signal.stopLoss)}
            sub={`${fmtSigned(signal.stopLoss - signal.entry)} · 1,2 ATR`}
            icon={<XOctagon size={13} />}
            tone="red"
          />
          <Level
            label="TAKE PROFIT 1"
            value={fmtPrice(signal.takeProfit1)}
            sub={`${fmtSigned(signal.takeProfit1 - signal.entry)} · R 1:1,5`}
            icon={<ShieldCheck size={13} />}
            tone="green"
          />
          <Level
            label="TAKE PROFIT 2"
            value={fmtPrice(signal.takeProfit2)}
            sub={`${fmtSigned(signal.takeProfit2 - signal.entry)} · R 1:2,5`}
            icon={<ShieldCheck size={13} />}
            tone="green"
          />
        </div>
      )}

      {/* Figure détectée */}
      {verdict?.pattern && !signal && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-zinc-200">{verdict.pattern.nameFr}</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${i <= verdict.pattern!.strength ? "bg-[#e8b94a]" : "bg-white/10"}`}
                />
              ))}
            </div>
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-zinc-500">{verdict.pattern.description}</p>
        </div>
      )}

      {/* Métriques */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric
          label="EMA 200"
          value={fmtPrice(ema200)}
          badge={
            distEma != null
              ? { text: `prix ${distEma >= 0 ? "+" : "−"}${Math.abs(distEma).toFixed(2).replace(".", ",")} %`, up: distEma >= 0 }
              : undefined
          }
        />
        <Metric
          label="RSI 14"
          value={rsi != null ? rsi.toFixed(1).replace(".", ",") : "—"}
          bar={rsi != null ? rsi / 100 : undefined}
          barColor={rsi != null && rsi > 50 ? "#2fbf8f" : "#f0564f"}
        />
        <Metric label="ATR 14" value={fmtPrice(atr)} />
        <Metric label="SESSION" value={verdict?.session.current === "OVERLAP" ? "LDN×NY" : verdict?.session.current === "LONDON" ? "LONDRES" : verdict?.session.current === "NEW_YORK" ? "NEW YORK" : verdict?.session.current === "ASIAN" ? "ASIE" : "ZONE CALME"} small />
      </div>

      {/* Miniature chandeliers clôturés */}
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#08080c] p-3">
        <div className="label-tech mb-2 flex justify-between">
          <span>28 dernières clôtures</span>
          <span className="text-[#e8b94a]/70">EMA 20</span>
        </div>
        <MiniChart candles={candles} />
      </div>
    </section>
  );
}

function Level({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: "gold" | "red" | "green";
}) {
  const tones = {
    gold: "border-[#e8b94a]/20 bg-[#e8b94a]/[0.05] text-[#f7d87c]",
    red: "border-red-400/15 bg-red-400/[0.05] text-red-300",
    green: "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300",
  };
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <span className="mono text-[10px] font-bold tracking-[0.18em]">{label}</span>
          <span className="mono ml-2 text-[10px] text-zinc-500">{sub}</span>
        </div>
      </div>
      <span className="mono text-[13.5px] font-bold text-zinc-100">{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  badge,
  bar,
  barColor,
  small,
}: {
  label: string;
  value: string;
  badge?: { text: string; up: boolean };
  bar?: number;
  barColor?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="label-tech" style={{ fontSize: 9 }}>{label}</div>
      <div className={`mono mt-1 font-bold text-zinc-100 ${small ? "text-[12px]" : "text-[15px]"}`}>{value}</div>
      {badge && (
        <div className={`mono mt-0.5 text-[9.5px] font-semibold ${badge.up ? "text-emerald-400" : "text-red-400"}`}>
          {badge.text}
        </div>
      )}
      {bar !== undefined && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar * 100}%`, background: barColor }} />
        </div>
      )}
    </div>
  );
}
