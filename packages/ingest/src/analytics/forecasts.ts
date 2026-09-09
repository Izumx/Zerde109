import type pg from "pg";

export type MonthPoint = { month: string; count: number };
export type ForecastPoint = {
  month: string;
  yhat: number;
  yhatLower: number;
  yhatUpper: number;
  method: "seasonal-naive" | "mean-fallback";
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
const std = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((v) => (v - m) ** 2)));
};

function addMonths(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Прогноз на `horizon` месяцев. ≥ 13 месяцев истории → сезонный-наив
 * (значение того же месяца год назад × сглаженный тренд); иначе — среднее
 * последних 3 месяцев. Полоса — ±1.5σ остатков.
 */
export function seasonalNaive(history: MonthPoint[], horizon = 3): ForecastPoint[] {
  if (history.length === 0) return [];
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const counts = sorted.map((p) => p.count);
  const lastMonth = sorted[sorted.length - 1]!.month;
  const out: ForecastPoint[] = [];

  if (sorted.length >= 13) {
    const recent = mean(counts.slice(-3));
    const yearAgo = mean(counts.slice(-15, -12));
    const trend = clamp(recent / Math.max(yearAgo, 1), 0.5, 2);
    const residuals = sorted.slice(12).map((p, i) => p.count - sorted[i]!.count);
    const band = 1.5 * (std(residuals) || Math.sqrt(recent) || 1);
    for (let h = 1; h <= horizon; h++) {
      const idxLastYear = sorted.length - 12 + (h - 1);
      const baseVal =
        idxLastYear >= 0 && idxLastYear < counts.length ? counts[idxLastYear]! : recent;
      const yhat = Math.max(0, Math.round(baseVal * trend));
      out.push({
        month: addMonths(lastMonth, h),
        yhat,
        yhatLower: Math.max(0, Math.round(yhat - band)),
        yhatUpper: Math.round(yhat + band),
        method: "seasonal-naive",
      });
    }
    return out;
  }

  const base = mean(counts.slice(-3));
  const band = 1.5 * (std(counts.slice(-6)) || Math.sqrt(base) || 1);
  for (let h = 1; h <= horizon; h++) {
    out.push({
      month: addMonths(lastMonth, h),
      yhat: Math.max(0, Math.round(base)),
      yhatLower: Math.max(0, Math.round(base - band)),
      yhatUpper: Math.round(base + band),
      method: "mean-fallback",
    });
  }
  return out;
}

export async function computeForecasts(pool: pg.Pool, horizon = 3): Promise<number> {
  const { rows } = await pool.query<{ region: string; theme: string; month: string; count: number }>(
    `SELECT region, theme,
            to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
            count(*)::int AS count
       FROM appeals
      GROUP BY region, theme, date_trunc('month', created_at)
      ORDER BY region, theme, month`,
  );
  const groups = new Map<string, MonthPoint[]>();
  for (const r of rows) {
    const key = `${r.region} ${r.theme}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push({ month: r.month, count: r.count });
  }
  await pool.query("TRUNCATE forecasts RESTART IDENTITY");
  let n = 0;
  for (const [key, history] of groups) {
    if (history.length < 6) continue;
    const [region, theme] = key.split(" ") as [string, string];
    for (const f of seasonalNaive(history, horizon)) {
      await pool.query(
        `INSERT INTO forecasts (region, theme, month, yhat, yhat_lower, yhat_upper, method)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (region, theme, month) DO UPDATE SET
           yhat=EXCLUDED.yhat, yhat_lower=EXCLUDED.yhat_lower, yhat_upper=EXCLUDED.yhat_upper,
           method=EXCLUDED.method, computed_at=now()`,
        [region, theme, f.month, f.yhat, f.yhatLower, f.yhatUpper, f.method],
      );
      n += 1;
    }
  }
  return n;
}
