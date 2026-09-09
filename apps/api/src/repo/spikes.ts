import type pg from "pg";
import type { RangeFilter, SpikeRow } from "@zerde/types";

export async function getSpikes(pool: pg.Pool, r: RangeFilter): Promise<SpikeRow[]> {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (r.region) {
    params.push(r.region);
    parts.push(`region = $${params.length}`);
  }
  if (r.theme) {
    params.push(r.theme);
    parts.push(`theme = $${params.length}`);
  }
  if (r.from) {
    params.push(r.from);
    parts.push(`day >= $${params.length}`);
  }
  if (r.to) {
    params.push(r.to);
    parts.push(`day <= $${params.length}`);
  }

  const whereClause = parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "";

  const res = await pool.query<{
    region: string;
    theme: string;
    day: string;
    baseline: number;
    current: number;
    ratio: number;
    zscore: number;
    severity: "low" | "medium" | "high";
  }>(
    `SELECT region, theme, to_char(day, 'YYYY-MM-DD') AS day,
            baseline, current, ratio, zscore, severity
       FROM spikes
      ${whereClause}
      ORDER BY zscore DESC
      LIMIT 100`,
    params,
  );

  return res.rows.map((row) => ({
    region: row.region,
    theme: row.theme as never,
    day: row.day,
    baseline: Number(row.baseline),
    current: Number(row.current),
    ratio: Number(row.ratio),
    zscore: Number(row.zscore),
    severity: row.severity,
  }));
}
