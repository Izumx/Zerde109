import type pg from "pg";
import type { Kpi, RangeFilter } from "@zerde/types";

// kpi считает период и предыдущий-период вручную (rangeWhere здесь не подходит —
// нужна арифметика по датам), поэтому rangeWhere не импортируем.
export async function getKpi(pool: pg.Pool, r: RangeFilter): Promise<Kpi> {
  // границы периода
  const bounds = await pool.query<{ lo: string; hi: string }>(
    r.from && r.to
      ? `SELECT $1::timestamptz AS lo, ($2::date + interval '1 day') AS hi`
      : `SELECT (max(created_at) - interval '30 days') AS lo, max(created_at) AS hi FROM appeals`,
    r.from && r.to ? [`${r.from}T00:00:00+05:00`, r.to] : [],
  );
  const lo = bounds.rows[0]!.lo;
  const hi = bounds.rows[0]!.hi;
  const spanMs = new Date(hi).getTime() - new Date(lo).getTime();
  const prevLo = new Date(new Date(lo).getTime() - spanMs).toISOString();

  const extra: string[] = [];
  const extraP: unknown[] = [];
  let i = 3;
  if (r.region) { extra.push(`region = $${i++}`); extraP.push(r.region); }
  if (r.theme) { extra.push(`theme = $${i++}`); extraP.push(r.theme); }
  const extraClause = extra.length ? ` AND ${extra.join(" AND ")}` : "";

  const main = await pool.query<{
    total: string; overdue: string; avg_close: string | null;
  }>(
    `SELECT count(*) total,
            count(*) FILTER (WHERE is_overdue) overdue,
            avg(EXTRACT(EPOCH FROM (closed_at - created_at))/3600.0) FILTER (WHERE closed_at IS NOT NULL) avg_close
       FROM appeals WHERE created_at >= $1 AND created_at < $2${extraClause}`,
    [lo, hi, ...extraP],
  );
  const prev = await pool.query<{ total: string }>(
    `SELECT count(*) total FROM appeals WHERE created_at >= $1 AND created_at < $2${extraClause}`,
    [prevLo, lo, ...extraP],
  );
  const repeats = await pool.query<{ n: string }>(
    `SELECT count(*) n FROM appeals a
      WHERE a.address IS NOT NULL AND a.created_at >= $1 AND a.created_at < $2${extraClause}
        AND EXISTS (SELECT 1 FROM appeals b
                     WHERE b.address = a.address AND b.region = a.region
                       AND b.created_at < a.created_at)`,
    [lo, hi, ...extraP],
  );
  const openParts: string[] = [];
  const openP: unknown[] = [];
  if (r.region) { openParts.push(`region = $${openP.length + 1}`); openP.push(r.region); }
  if (r.theme) { openParts.push(`theme = $${openP.length + 1}`); openP.push(r.theme); }
  const open = await pool.query<{ n: string }>(
    `SELECT count(*) n FROM appeals WHERE status IN ('new','routed','in_progress')${
      openParts.length ? ` AND ${openParts.join(" AND ")}` : ""
    }`,
    openP,
  );

  const total = Number(main.rows[0]!.total);
  const prevTotal = Number(prev.rows[0]!.total);
  return {
    total,
    prevTotal,
    deltaPct: prevTotal ? (total - prevTotal) / prevTotal : 0,
    overdueShare: total ? Number(main.rows[0]!.overdue) / total : 0,
    avgCloseHours: main.rows[0]!.avg_close ? Math.round(Number(main.rows[0]!.avg_close)) : null,
    repeatShare: total ? Number(repeats.rows[0]!.n) / total : 0,
    openNow: Number(open.rows[0]!.n),
  };
}
