export const fmtPrice = (v: number | null | undefined, dec = 2): string =>
  v == null || Number.isNaN(v)
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      }).format(v);

export const fmtSigned = (v: number | null | undefined, dec = 2): string =>
  v == null || Number.isNaN(v) ? "—" : `${v >= 0 ? "+" : "−"}${fmtPrice(Math.abs(v), dec)}`;

export const fmtPct = (v: number | null | undefined, dec = 2): string =>
  v == null || Number.isNaN(v) ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(dec).replace(".", ",")} %`;

/** HH:MM:SS UTC */
export const fmtClockUTC = (d: Date): string => d.toISOString().slice(11, 19);

/** HH:MM UTC from ms timestamp */
export const fmtTimeUTC = (ts: number): string => new Date(ts).toISOString().slice(11, 16);

export const fmtHMSfromMs = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

export const timeAgo = (ts: number, now: number): string => {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h ${String(min % 60).padStart(2, "0")}`;
  return `il y a ${Math.floor(h / 24)} j`;
};
