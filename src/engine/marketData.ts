import type { Candle, Timeframe } from "./types";
import { TF_MINUTES } from "./sessions";

/* ─────────────────────────────────────────────────────────────
   Flux de données temps réel — or (PAXG/USD, proxy 1:1 du XAU)
   Chaîne de résilience : Binance → Kraken → Coinbase → simulation
   ───────────────────────────────────────────────────────────── */

export type ProviderId = "BINANCE" | "KRAKEN" | "COINBASE" | "SIMULATION";

export interface MarketSnapshot {
  candles: Candle[];
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  provider: ProviderId;
  providerLabel: string;
}

const BINANCE_INTERVAL: Record<Timeframe, string> = { M15: "15m", M30: "30m", H1: "1h", H4: "4h" };

async function fetchJson(url: string, timeoutMs = 9000): Promise<any> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function sanitize(candles: Candle[]): Candle[] {
  return candles.filter(
    (c) =>
      Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) &&
      Number.isFinite(c.close) && c.high >= c.low && c.high > 0,
  );
}

/* ── Binance · PAXG/USDT ─────────────────────────────────────── */
async function fromBinance(tf: Timeframe): Promise<MarketSnapshot> {
  const [klines, ticker] = await Promise.all([
    fetchJson(`https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${BINANCE_INTERVAL[tf]}&limit=300`),
    fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT`),
  ]);
  const now = Date.now();
  const candles: Candle[] = (klines as any[]).map((k) => ({
    time: k[0],
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    volume: +k[5],
    closeTime: k[6],
    isClosed: k[6] <= now,
  }));
  if (candles.length < 60) throw new Error("Données insuffisantes");
  return {
    candles: sanitize(candles),
    price: +ticker.lastPrice,
    change24h: +ticker.priceChangePercent,
    high24h: +ticker.highPrice,
    low24h: +ticker.lowPrice,
    provider: "BINANCE",
    providerLabel: "BINANCE · PAXG/USDT",
  };
}

/* ── Kraken · PAXG/USD ───────────────────────────────────────── */
async function fromKraken(tf: Timeframe): Promise<MarketSnapshot> {
  const minutes = TF_MINUTES[tf];
  const ohlc = await fetchJson(`https://api.kraken.com/0/public/OHLC?pair=PAXGUSD&interval=${minutes}`);
  const key = Object.keys(ohlc.result).find((k) => k !== "last");
  if (!key) throw new Error("Clé introuvable");
  const rows: any[] = ohlc.result[key];
  const stepMs = minutes * 60_000;
  const now = Date.now();
  const candles: Candle[] = rows.map((r) => ({
    time: r[0] * 1000,
    open: +r[1],
    high: +r[2],
    low: +r[3],
    close: +r[4],
    volume: +r[6],
    closeTime: r[0] * 1000 + stepMs,
    isClosed: r[0] * 1000 + stepMs <= now,
  }));
  if (candles.length < 60) throw new Error("Données insuffisantes");
  const tick = await fetchJson(`https://api.kraken.com/0/public/Ticker?pair=PAXGUSD`);
  const t = tick.result[Object.keys(tick.result)[0]];
  const price = +t.c[0];
  const dayAgo = candles.find((c) => c.time >= now - 86_400_000) ?? candles[0];
  return {
    candles: sanitize(candles),
    price,
    change24h: ((price - dayAgo.open) / dayAgo.open) * 100,
    high24h: +t.h[1],
    low24h: +t.l[1],
    provider: "KRAKEN",
    providerLabel: "KRAKEN · PAXG/USD",
  };
}

/* ── Coinbase · PAXG-USD (granularités limitées → agrégation) ── */
function aggregate(candles: Candle[], targetMin: number): Candle[] {
  const targetMs = targetMin * 60_000;
  const map = new Map<number, Candle>();
  for (const c of candles) {
    const bucket = Math.floor(c.time / targetMs) * targetMs;
    const existing = map.get(bucket);
    if (!existing) {
      map.set(bucket, { ...c, time: bucket, closeTime: bucket + targetMs });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }
  const now = Date.now();
  return [...map.values()].sort((a, b) => a.time - b.time).map((c) => ({ ...c, isClosed: c.closeTime <= now }));
}

async function fromCoinbase(tf: Timeframe): Promise<MarketSnapshot> {
  const targetMin = TF_MINUTES[tf];
  const gran = targetMin <= 15 ? 900 : 3600;
  const end = new Date();
  const start = new Date(end.getTime() - 295 * gran * 1000);
  const rows: any[] = await fetchJson(
    `https://api.exchange.coinbase.com/products/PAXG-USD/candles?granularity=${gran}&start=${start.toISOString()}&end=${end.toISOString()}`,
  );
  const stepMs = gran * 1000;
  const now = Date.now();
  const base: Candle[] = rows
    .map((r) => ({
      time: r[0] * 1000,
      low: +r[1],
      high: +r[2],
      open: +r[3],
      close: +r[4],
      volume: +r[5],
      closeTime: r[0] * 1000 + stepMs,
      isClosed: r[0] * 1000 + stepMs <= now,
    }))
    .sort((a, b) => a.time - b.time);
  const stats = await fetchJson(`https://api.exchange.coinbase.com/products/PAXG-USD/stats`);
  const candles = targetMin === gran / 60 ? base : aggregate(base, targetMin);
  if (candles.length < 60) throw new Error("Données insuffisantes");
  return {
    candles: sanitize(candles),
    price: +stats.last,
    change24h: ((+stats.last - +stats.open) / +stats.open) * 100,
    high24h: +stats.high,
    low24h: +stats.low,
    provider: "COINBASE",
    providerLabel: "COINBASE · PAXG-USD",
  };
}

/* ── Simulation déterministe (secours hors-ligne) ────────────── */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulated(tf: Timeframe): MarketSnapshot {
  const step = TF_MINUTES[tf] * 60_000;
  const n = 320;
  const now = Date.now();
  const end = Math.floor(now / step) * step + step;
  const rnd = mulberry32(1337 + TF_MINUTES[tf]);
  let price = 2912.4;
  const candles: Candle[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const open = price;
    const close = open + (rnd() - 0.488) * 3.1;
    const high = Math.max(open, close) + rnd() * 1.5;
    const low = Math.min(open, close) - rnd() * 1.5;
    const time = end - (i + 1) * step;
    candles.push({
      time,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: 120 + rnd() * 600,
      closeTime: time + step,
      isClosed: time + step <= now,
    });
    price = close;
  }
  const ref = candles.find((c) => c.time >= now - 86_400_000) ?? candles[0];
  return {
    candles,
    price: round2(price),
    change24h: ((price - ref.open) / ref.open) * 100,
    high24h: Math.max(...candles.slice(-100).map((c) => c.high)),
    low24h: Math.min(...candles.slice(-100).map((c) => c.low)),
    provider: "SIMULATION",
    providerLabel: "SIMULATION · HORS-LIGNE",
  };
}

export async function fetchMarketSnapshot(tf: Timeframe): Promise<MarketSnapshot> {
  try { return await fromBinance(tf); } catch { /* fournisseur suivant */ }
  try { return await fromKraken(tf); } catch { /* fournisseur suivant */ }
  try { return await fromCoinbase(tf); } catch { /* fournisseur suivant */ }
  return simulated(tf);
}
