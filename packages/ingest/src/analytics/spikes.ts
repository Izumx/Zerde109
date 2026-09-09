import type pg from "pg";

export type SpikePoint = { day: string; count: number };
export type DetectedSpike = {
  day: string;
  baseline: number;
  current: number;
  ratio: number;
  zscore: number;
  severity: "low" | "medium" | "high";
};

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Всплеск — день, чей счётчик отклоняется на ≥ `zThresh` σ от скользящего
 * среднего за `windowDays` предыдущих дней (и минимум +3 к среднему).
 */
export function detectSpikes(
  series: SpikePoint[],
  windowDays = 28,
  zThresh = 2.5,
): DetectedSpike[] {
  const sorted = [...series].sort((a, b) => a.day.localeCompare(b.day));
  const out: DetectedSpike[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const window = sorted.slice(Math.max(0, i - windowDays), i);
    if (window.length < 7) continue;
    const vals = window.map((p) => p.count);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
    const current = sorted[i]!.count;
    const z = (current - mean) / sd;
    if (z >= zThresh && current >= mean + 3) {
      out.push({
        day: sorted[i]!.day,
        baseline: round(mean),
        current,
        ratio: round(current / Math.max(mean, 1)),
        zscore: round(z),
        severity: z >= 5 ? "high" : z >= 3.5 ? "medium" : "low",
      });
    }
  }
  return out;
}

export async function computeSpikes(pool: pg.Pool, windowDays = 28): Promise<number> {
  const { rows } = await pool.query<{ region: string; theme: string; day: string; count: number }>(
    `SELECT region, theme, to_char(day, 'YYYY-MM-DD') AS day, count
       FROM mv_daily_counts ORDER BY region, theme, day`,
  );
  const groups = new Map<string, SpikePoint[]>();
  for (const r of rows) {
    const key = `${r.region} ${r.theme}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push({ day: r.day, count: r.count });
  }
  await pool.query("TRUNCATE spikes RESTART IDENTITY");
  let n = 0;
  for (const [key, series] of groups) {
    const [region, theme] = key.split(" ") as [string, string];
    for (const s of detectSpikes(series, windowDays)) {
      await pool.query(
        `INSERT INTO spikes (region, theme, day, window_days, baseline, current, ratio, zscore, severity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (region, theme, day) DO UPDATE SET
           baseline=EXCLUDED.baseline, current=EXCLUDED.current, ratio=EXCLUDED.ratio,
           zscore=EXCLUDED.zscore, severity=EXCLUDED.severity, computed_at=now()`,
        [region, theme, s.day, windowDays, s.baseline, s.current, s.ratio, s.zscore, s.severity],
      );
      n += 1;
    }
  }
  return n;
}
