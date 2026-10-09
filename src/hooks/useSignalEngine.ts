import { useEffect, useRef, useState } from "react";
import type { Candle, EngineVerdict, Signal, Timeframe } from "../engine/types";
import { fetchMarketSnapshot, type MarketSnapshot } from "../engine/marketData";
import { runSignalEngine, updateSignalStatus } from "../engine/signalEngine";

interface EngineState {
  snapshot: MarketSnapshot | null;
  verdict: EngineVerdict | null;
  history: Signal[];
  clock: Date;
  loading: boolean;
}

const POLL_MS = 15_000; // resynchronisation du flux marché
const TICK_MS = 1_000; // ré-évaluation des verrous chaque seconde

export function useSignalEngine(timeframe: Timeframe): EngineState {
  const candlesRef = useRef<Candle[]>([]);
  const [state, setState] = useState<EngineState>({
    snapshot: null,
    verdict: null,
    history: [],
    clock: new Date(),
    loading: true,
  });

  /* ── Boucle de récupération du flux marché ─────────────────── */
  useEffect(() => {
    let alive = true;
    let timer = 0;
    candlesRef.current = [];
    setState((s) => ({ ...s, loading: true }));

    const load = async () => {
      try {
        const snap = await fetchMarketSnapshot(timeframe);
        if (!alive) return;
        candlesRef.current = snap.candles;
        setState((s) => ({
          ...s,
          snapshot: snap,
          loading: false,
          history: s.history.map((sig) => updateSignalStatus(sig, snap.candles)),
        }));
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
      if (alive) timer = window.setTimeout(load, POLL_MS);
    };

    void load();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [timeframe]);

  /* ── Battement du moteur : verrous ré-évalués chaque seconde ──
        La bougie en formation (VERROU N°1) n'est jamais
        transmise à l'analyse, quel que soit l'instant.           */
  useEffect(() => {
    const i = window.setInterval(() => {
      const now = new Date();
      setState((s) => {
        if (!candlesRef.current.length) return { ...s, clock: now };
        const v = runSignalEngine(candlesRef.current, timeframe, now);
        let history = s.history;
        if (v.signal && !history.some((x) => x.id === v.signal!.id)) {
          history = [v.signal, ...history].slice(0, 14);
        }
        return { ...s, clock: now, verdict: v, history };
      });
    }, TICK_MS);
    return () => window.clearInterval(i);
  }, [timeframe]);

  return state;
}
