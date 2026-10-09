/* ─────────────────────────────────────────────────────────────
   AURUM · Moteur de signaux XAU/USD — Types fondamentaux
   ───────────────────────────────────────────────────────────── */

export type Timeframe = "M15" | "M30" | "H1" | "H4";

/** VERROU N°4 — Seules ces unités de temps sont autorisées. */
export const ALLOWED_TIMEFRAMES: readonly Timeframe[] = ["M15", "M30", "H1", "H4"] as const;

/** Unités explicitement bannies par le moteur. */
export const FORBIDDEN_TIMEFRAMES = ["M1", "M5"] as const;

export interface Candle {
  /** open time (ms) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** close time (ms) */
  closeTime: number;
  /** VERROU N°1 — une bougie non clôturée ne doit JAMAIS être analysée. */
  isClosed: boolean;
}

export type Direction = "BUY" | "SELL";

export type SignalStatus = "ACTIVE" | "TP1" | "TP2" | "SL";

export interface Signal {
  id: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  confidence: number; // 0–100
  pattern: string;
  timeframe: Timeframe;
  candleTime: number;
  createdAt: number;
  session: string;
  status: SignalStatus;
}

export type LockId = "CANDLE" | "TIMEFRAME" | "TREND";

export interface LockResult {
  id: LockId;
  index: string; // "01"…"03" (ordre d'exécution des contrôles)
  label: string;
  passed: boolean;
  detail: string;
}

export type SessionKind = "LONDON" | "NEW_YORK" | "OVERLAP" | "ASIAN" | "DEAD";

/** Information de session — purement indicative, ne bloque jamais le scan. */
export interface SessionInfo {
  current: SessionKind;
  liquidity: "HIGH" | "LOW";
  label: string;
  utcMinutes: number;
}

export interface PatternMatch {
  name: string;
  nameFr: string;
  direction: Direction | "NEUTRAL";
  strength: 1 | 2 | 3;
  description: string;
}

export interface EngineVerdict {
  code: "SIGNAL" | "NO_SIGNAL";
  /** vrai si un pattern valide a été bloqué par le verrou EMA200 */
  rejected: boolean;
  reason: string;
  locks: LockResult[];
  trend: "BULLISH" | "BEARISH" | "NONE";
  ema200: number | null;
  price: number | null;
  rsi: number | null;
  atr: number | null;
  pattern: PatternMatch | null;
  signal: Signal | null;
  session: SessionInfo;
  analyzedAt: number;
  nextCandleClose: number;
  lastClosedTime: number;
  lastClosed: Candle | null;
}
