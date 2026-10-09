import type { SessionInfo, Timeframe } from "./types";

export const TF_MINUTES: Record<Timeframe, number> = { M15: 15, M30: 30, H1: 60, H4: 240 };

export interface SessionSegment {
  id: string;
  label: string;
  startMin: number; // minutes UTC
  endMin: number;
  /** Session majeure (Londres / New York) — informationnel, jamais bloquant. */
  major: boolean;
  kind: SessionInfo["current"];
}

/** Repères de liquidité sur 24h (UTC) — affichage contextuel uniquement. */
export const SESSION_SEGMENTS: SessionSegment[] = [
  { id: "asia", label: "Asie", startMin: 0, endMin: 420, major: false, kind: "ASIAN" },
  { id: "london", label: "Londres", startMin: 420, endMin: 780, major: true, kind: "LONDON" },
  { id: "overlap", label: "Londres × New York", startMin: 780, endMin: 960, major: true, kind: "OVERLAP" },
  { id: "ny", label: "New York", startMin: 960, endMin: 1320, major: true, kind: "NEW_YORK" },
  { id: "dead", label: "Zone calme", startMin: 1320, endMin: 1440, major: false, kind: "DEAD" },
];

const LABELS: Record<SessionInfo["current"], string> = {
  LONDON: "Session de Londres",
  NEW_YORK: "Session de New York",
  OVERLAP: "Chevauchement Londres × New York",
  ASIAN: "Session asiatique — liquidité réduite",
  DEAD: "Fin de New York — zone calme",
};

export function getSessionInfo(now: Date = new Date()): SessionInfo {
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  const seg =
    SESSION_SEGMENTS.find((s) => m >= s.startMin && m < s.endMin) ??
    SESSION_SEGMENTS[SESSION_SEGMENTS.length - 1];

  return { current: seg.kind, liquidity: seg.major ? "HIGH" : "LOW", label: LABELS[seg.kind], utcMinutes: m };
}

export interface CandleClock {
  intervalMs: number;
  nextClose: number;
  lastClose: number;
  msToClose: number;
  /** 0 → 1 progression de la bougie en formation */
  progress: number;
}

export function getCandleClock(tf: Timeframe, now: Date = new Date()): CandleClock {
  const intervalMs = TF_MINUTES[tf] * 60_000;
  const t = now.getTime();
  const start = Math.floor(t / intervalMs) * intervalMs;
  const nextClose = start + intervalMs;
  return {
    intervalMs,
    nextClose,
    lastClose: start,
    msToClose: nextClose - t,
    progress: (t - start) / intervalMs,
  };
}
