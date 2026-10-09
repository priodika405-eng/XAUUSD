import type { Candle, EngineVerdict, LockResult, Signal, SignalStatus, Timeframe } from "./types";
import { ALLOWED_TIMEFRAMES } from "./types";
import { atr, ema, rsi } from "./indicators";
import { detectPattern } from "./patterns";
import { getCandleClock, getSessionInfo } from "./sessions";

/* ═══════════════════════════════════════════════════════════════
   MOTEUR DE SIGNAUX — VERROUS OBLIGATOIRES (non désactivables)
   Ordre de priorité strict :
     01 · Bougie clôturée        (RÈGLE N°1)
     02 · Unité de temps M15→H4  (RÈGLE N°4)
     03 · Filtre de tendance     (RÈGLE N°2 · EMA 200)
     04 · Figures de chandeliers
     05 · Émission du signal
   Un seul échec ⇒ NO_SIGNAL, aucun calcul ne se poursuit.
   ═══════════════════════════════════════════════════════════════ */

export function runSignalEngine(rawCandles: Candle[], timeframe: string, now = new Date()): EngineVerdict {
  const t = now.getTime();
  const clock = getCandleClock(timeframe as Timeframe, now);
  const session = getSessionInfo(now); // contexte informatif — jamais bloquant
  const locks: LockResult[] = [];

  const livePrice = rawCandles.length ? rawCandles[rawCandles.length - 1].close : null;

  const verdict = (
    partial: Partial<EngineVerdict> & { code: EngineVerdict["code"]; reason: string },
  ): EngineVerdict => ({
    rejected: false,
    trend: "NONE",
    ema200: null,
    price: livePrice,
    rsi: null,
    atr: null,
    pattern: null,
    signal: null,
    session,
    analyzedAt: t,
    nextCandleClose: clock.nextClose,
    lastClosedTime: clock.lastClose,
    lastClosed: null,
    locks,
    ...partial,
  });

  /* ── CONTRÔLE 01 · CLÔTURE DE BOUGIE (RÈGLE N°1) ──────────────
     if (candle.isClosed == false) return NO_SIGNAL;
     La bougie en formation n'est JAMAIS transmise à l'analyse :
     elle est exclue du flux avant tout calcul de pattern.        */
  if (!rawCandles.length) {
    locks.push({ id: "CANDLE", index: "01", label: "Bougie clôturée", passed: false, detail: "Aucune donnée reçue du flux" });
    return verdict({ code: "NO_SIGNAL", reason: "VERROU N°1 — Flux de données indisponible, analyse impossible." });
  }
  const closed = rawCandles.filter((c) => c.isClosed);
  const lastClosed = closed[closed.length - 1];
  const forming: Candle | null = rawCandles[rawCandles.length - 1].isClosed
    ? null
    : rawCandles[rawCandles.length - 1];
  if (!lastClosed) {
    locks.push({ id: "CANDLE", index: "01", label: "Bougie clôturée", passed: false, detail: "Aucune clôture officielle disponible" });
    return verdict({ code: "NO_SIGNAL", reason: "VERROU N°1 — En attente de la première clôture officielle." });
  }
  locks.push({
    id: "CANDLE",
    index: "01",
    label: "Bougie clôturée",
    passed: true,
    detail: forming
      ? "Bougie en formation exclue — analyse verrouillée sur la dernière clôture"
      : "Analyse calée sur la dernière clôture officielle",
  });

  /* ── CONTRÔLE 02 · UNITÉ DE TEMPS AUTORISÉE (RÈGLE N°4) ───────
     M1 et M5 sont interdits. M15 · M30 · H1 · H4 uniquement.
     Aucun paramètre ne peut désactiver ce verrou.               */
  if (!ALLOWED_TIMEFRAMES.includes(timeframe as Timeframe)) {
    locks.push({ id: "TIMEFRAME", index: "02", label: "Unité de temps autorisée", passed: false, detail: `${timeframe} détecté — unité interdite` });
    return verdict({
      code: "NO_SIGNAL",
      reason: `VERROU N°4 — ${timeframe} interdit. Seuls M15 · M30 · H1 · H4 sont analysables. Scan bloqué.`,
      lastClosed,
    });
  }
  locks.push({
    id: "TIMEFRAME",
    index: "02",
    label: "Unité de temps autorisée",
    passed: true,
    detail: `${timeframe} conforme — M1 / M5 bloqués en permanence`,
  });

  /* ── CONTRÔLE 03 · TENDANCE EMA 200 (RÈGLE N°2) ───────────────
     Prix < EMA200 ⇒ BUY interdit · Prix > EMA200 ⇒ SELL interdit.
     Ce verrou est prioritaire sur toute figure de chandelier.   */
  const closes = closed.map((c) => c.close);
  const ema200 = ema(closes, 200);
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(closed, 14);

  if (ema200 === null) {
    locks.push({ id: "TREND", index: "03", label: "Filtre de tendance EMA 200", passed: false, detail: "Historique insuffisant (< 200 clôtures)" });
    return verdict({
      code: "NO_SIGNAL",
      reason: "VERROU N°2 — Historique insuffisant pour calibrer l'EMA 200. Tendance indéterminable.",
      lastClosed,
      rsi: rsi14,
      atr: atr14,
    });
  }

  const trend: "BULLISH" | "BEARISH" = lastClosed.close > ema200 ? "BULLISH" : "BEARISH";
  locks.push({
    id: "TREND",
    index: "03",
    label: "Filtre de tendance EMA 200",
    passed: true,
    detail:
      trend === "BULLISH"
        ? "Prix au-dessus de l'EMA 200 — ventes interdites"
        : "Prix sous l'EMA 200 — achats interdits",
  });

  /* ── ÉTAPE 04 · FIGURES DE CHANDELIERS ────────────────────────
     Exécutée uniquement après validation des 3 verrous.         */
  const pattern = detectPattern(closed);

  const base = { lastClosed, trend, ema200, rsi: rsi14, atr: atr14, pattern };

  if (atr14 === null) {
    return verdict({ code: "NO_SIGNAL", reason: "Volatilité non mesurable (ATR indisponible). Signal refusé.", ...base });
  }
  if (!pattern) {
    return verdict({
      code: "NO_SIGNAL",
      reason: "Aucune figure de chandelier validée sur la dernière clôture. Le moteur reste en veille.",
      ...base,
    });
  }
  if (pattern.direction === "NEUTRAL") {
    return verdict({
      code: "NO_SIGNAL",
      reason: `${pattern.nameFr} détecté — indécision du marché, aucune entrée autorisée.`,
      ...base,
    });
  }

  // Application absolue du VERROU N°2 : rejet immédiat des contresens.
  if (pattern.direction === "BUY" && trend !== "BULLISH") {
    return verdict({
      code: "NO_SIGNAL",
      rejected: true,
      reason: `SIGNAL REJETÉ — ${pattern.nameFr} haussier bloqué : prix sous l'EMA 200, tout achat est interdit (VERROU N°2).`,
      ...base,
    });
  }
  if (pattern.direction === "SELL" && trend !== "BEARISH") {
    return verdict({
      code: "NO_SIGNAL",
      rejected: true,
      reason: `SIGNAL REJETÉ — ${pattern.nameFr} baissier bloqué : prix au-dessus de l'EMA 200, toute vente est interdite (VERROU N°2).`,
      ...base,
    });
  }

  /* ── ÉTAPE 05 · ÉMISSION DU SIGNAL ────────────────────────────
     Toutes les conditions sont validées : génération autorisée. */
  const dir = pattern.direction as "BUY" | "SELL";
  const entry = lastClosed.close;
  const risk = atr14 * 1.2;
  const stopLoss = dir === "BUY" ? entry - risk : entry + risk;
  const takeProfit1 = dir === "BUY" ? entry + risk * 1.5 : entry - risk * 1.5;
  const takeProfit2 = dir === "BUY" ? entry + risk * 2.5 : entry - risk * 2.5;

  // Indice de confluence (pondération informative — ne bloque rien)
  const distAtr = Math.abs(entry - ema200) / atr14;
  let confidence = 46 + pattern.strength * 12;
  if (rsi14 !== null && ((dir === "BUY" && rsi14 > 50) || (dir === "SELL" && rsi14 < 50))) confidence += 10;
  if (session.liquidity === "HIGH") confidence += 9; // session majeure : liquidité élevée
  if (distAtr >= 0.3 && distAtr <= 2.6) confidence += 9;
  confidence = Math.min(97, Math.round(confidence));

  const signal: Signal = {
    id: `${timeframe}-${lastClosed.time}-${dir}`,
    direction: dir,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskReward: 2.5,
    confidence,
    pattern: pattern.nameFr,
    timeframe: timeframe as Timeframe,
    candleTime: lastClosed.time,
    createdAt: t,
    session: session.label,
    status: "ACTIVE",
  };

  return verdict({
    code: "SIGNAL",
    reason: `${pattern.nameFr} validé en confluence avec la tendance ${trend === "BULLISH" ? "haussière" : "baissière"} EMA 200. Signal autorisé.`,
    signal,
    ...base,
  });
}

/** Suivi temps réel des signaux émis (TP1 / TP2 / SL). */
export function updateSignalStatus(s: Signal, candles: Candle[]): Signal {
  if (s.status === "TP2" || s.status === "SL") return s;
  let status: SignalStatus = s.status;
  for (const c of candles) {
    if (!c.isClosed || c.time <= s.candleTime) continue;
    if (s.direction === "BUY") {
      if (status === "ACTIVE" && c.low <= s.stopLoss) { status = "SL"; break; }
      if (c.high >= s.takeProfit2) { status = "TP2"; break; }
      if (c.high >= s.takeProfit1) status = "TP1";
    } else {
      if (status === "ACTIVE" && c.high >= s.stopLoss) { status = "SL"; break; }
      if (c.low <= s.takeProfit2) { status = "TP2"; break; }
      if (c.low <= s.takeProfit1) status = "TP1";
    }
  }
  return status === s.status ? s : { ...s, status };
}
