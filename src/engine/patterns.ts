import type { Candle, PatternMatch } from "./types";

/* ─────────────────────────────────────────────────────────────
   Détection de figures de chandeliers — exécutée UNIQUEMENT
   sur des bougies clôturées (VERROU N°1 appliqué en amont).
   ───────────────────────────────────────────────────────────── */

interface Stats {
  body: number;
  range: number;
  upper: number;
  lower: number;
  bullish: boolean;
  mid: number;
}

const stats = (c: Candle): Stats => {
  const body = Math.abs(c.close - c.open);
  const range = Math.max(c.high - c.low, 1e-9);
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  return { body, range, upper, lower, bullish: c.close >= c.open, mid: (c.open + c.close) / 2 };
};

export function detectPattern(closed: Candle[]): PatternMatch | null {
  if (closed.length < 6) return null;

  const C1 = closed[closed.length - 3];
  const C2 = closed[closed.length - 2];
  const C3 = closed[closed.length - 1];
  const c1 = stats(C1);
  const c2 = stats(C2);
  const c3 = stats(C3);

  // Volatilité de référence : on ignore les marchés plats / bougies fantômes.
  const refRanges = closed.slice(-18, -2).map((c) => c.high - c.low);
  const avgRange = refRanges.reduce((a, b) => a + b, 0) / Math.max(refRanges.length, 1);
  if (avgRange <= 0 || c3.range < avgRange * 0.22) return null;

  /* ── Figures à 3 bougies (force 3) ─────────────────────────── */

  // Étoile du matin
  if (
    !c1.bullish && c1.body > avgRange * 0.42 &&
    c2.body < c1.body * 0.4 &&
    c3.bullish && C3.close > c1.mid
  ) {
    return {
      name: "Morning Star",
      nameFr: "Étoile du matin",
      direction: "BUY",
      strength: 3,
      description:
        "Retournement haussier en trois temps : capitulation vendeuse, indécision, puis reprise acheteuse au-delà du milieu de la première bougie.",
    };
  }

  // Étoile du soir
  if (
    c1.bullish && c1.body > avgRange * 0.42 &&
    c2.body < c1.body * 0.4 &&
    !c3.bullish && C3.close < c1.mid
  ) {
    return {
      name: "Evening Star",
      nameFr: "Étoile du soir",
      direction: "SELL",
      strength: 3,
      description:
        "Essoufflement acheteur suivi d'une prise de contrôle vendeuse : la troisième bougie clôture sous le milieu de la première.",
    };
  }

  // Trois soldats blancs
  if (
    c1.bullish && c2.bullish && c3.bullish &&
    C2.close > C1.close && C3.close > C2.close &&
    C2.open > C1.open && C3.open > C2.open &&
    c1.body > avgRange * 0.3 && c2.body > avgRange * 0.3 && c3.body > avgRange * 0.3
  ) {
    return {
      name: "Three White Soldiers",
      nameFr: "Trois soldats blancs",
      direction: "BUY",
      strength: 3,
      description: "Trois clôtures haussières consécutives avec corps pleins : pression acheteuse soutenue et ordonnée.",
    };
  }

  // Trois corbeaux noirs
  if (
    !c1.bullish && !c2.bullish && !c3.bullish &&
    C2.close < C1.close && C3.close < C2.close &&
    C2.open < C1.open && C3.open < C2.open &&
    c1.body > avgRange * 0.3 && c2.body > avgRange * 0.3 && c3.body > avgRange * 0.3
  ) {
    return {
      name: "Three Black Crows",
      nameFr: "Trois corbeaux noirs",
      direction: "SELL",
      strength: 3,
      description: "Trois clôtures baissières consécutives : distribution vendeuse méthodique, pression baissière dominante.",
    };
  }

  /* ── Figures à 2 bougies (force 3 ou 2) ────────────────────── */

  // Engloutissante haussière
  if (!c2.bullish && c3.bullish && C3.close >= C2.open && C3.open <= C2.close && c3.body > c2.body * 1.05) {
    return {
      name: "Bullish Engulfing",
      nameFr: "Engloutissante haussière",
      direction: "BUY",
      strength: 3,
      description: "Le corps acheteur engloutit intégralement le corps vendeur précédent : absorption de l'offre.",
    };
  }

  // Engloutissante baissière
  if (c2.bullish && !c3.bullish && C3.open >= C2.close && C3.close <= C2.open && c3.body > c2.body * 1.05) {
    return {
      name: "Bearish Engulfing",
      nameFr: "Engloutissante baissière",
      direction: "SELL",
      strength: 3,
      description: "Le corps vendeur engloutit le corps acheteur précédent : absorption brutale de la demande.",
    };
  }

  // Piercing
  if (!c2.bullish && c3.bullish && C3.open < C2.close && C3.close > c2.mid && C3.close < C2.open) {
    return {
      name: "Piercing Line",
      nameFr: "Ligne de percée",
      direction: "BUY",
      strength: 2,
      description: "Ouverture en gap baissier suivie d'une clôture au-delà du milieu du corps vendeur : rejet des plus bas.",
    };
  }

  // Couverture en nuage noir
  if (c2.bullish && !c3.bullish && C3.open > C2.close && C3.close < c2.mid && C3.close > C2.open) {
    return {
      name: "Dark Cloud Cover",
      nameFr: "Couverture en nuage noir",
      direction: "SELL",
      strength: 2,
      description: "Ouverture en gap haussier piégée : la clôture s'enfonce sous le milieu du corps acheteur précédent.",
    };
  }

  /* ── Figures à 1 bougie (force 2 ou 1) ─────────────────────── */

  // Marteau
  if (c3.lower >= c3.body * 2.1 && c3.upper <= c3.body * 0.9 && c3.body > 0 && c3.lower > avgRange * 0.35) {
    return {
      name: "Hammer",
      nameFr: "Marteau",
      direction: "BUY",
      strength: 2,
      description: "Longue mèche basse rejetée : les acheteurs ont absorbé toute la pression vendeuse en séance.",
    };
  }

  // Étoile filante
  if (c3.upper >= c3.body * 2.1 && c3.lower <= c3.body * 0.9 && c3.body > 0 && c3.upper > avgRange * 0.35) {
    return {
      name: "Shooting Star",
      nameFr: "Étoile filante",
      direction: "SELL",
      strength: 2,
      description: "Longue mèche haute rejetée : tentative acheteuse soldée par une distribution agressive.",
    };
  }

  // Doji — indécision (verrou directionnel)
  if (c3.body <= c3.range * 0.1 && c3.range >= avgRange * 0.4) {
    return {
      name: "Doji",
      nameFr: "Doji",
      direction: "NEUTRAL",
      strength: 1,
      description: "Ouverture et clôture quasi identiques : équilibre parfait, aucune entrée autorisée.",
    };
  }

  return null;
}
