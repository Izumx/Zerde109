const nf = new Intl.NumberFormat("ru-RU");

export const fmtInt = (n: number): string => nf.format(Math.round(n));

/** доля 0..1 → «12%» */
export const fmtPct = (x: number): string => `${Math.round(x * 100)}%`;

/** дельта 0..1 → «+12%» / «−8%» */
export const fmtDelta = (x: number): string => {
  const p = Math.round(x * 100);
  if (p === 0) return "0%";
  return `${p > 0 ? "+" : "−"}${Math.abs(p)}%`;
};

export const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("ru-RU");
};

export const fmtHours = (h: number | null): string => {
  if (h === null) return "—";
  if (h < 24) return `${Math.round(h)} ч`;
  return `${Math.round(h / 24)} дн`;
};
