import type pg from "pg";
import type { Granularity, RangeFilter, TimeseriesResponse } from "@zerde/types";
import { rangeWhere } from "../schema";

export async function getTimeseries(
  pool: pg.Pool,
  r: RangeFilter,
  granularity: Granularity,
): Promise<TimeseriesResponse> {
  const { clause, params } = rangeWhere(r);
  const rows = await pool.query<{ bucket: string; count: string; overdue: string }>(
    `WITH b AS (
       SELECT date_trunc($${params.length + 1}, created_at AT TIME ZONE 'Asia/Almaty') AS bucket,
              count(*) AS count,
              count(*) FILTER (WHERE is_overdue) AS overdue
         FROM appeals ${clause}
        GROUP BY 1)
     SELECT to_char(bucket, 'YYYY-MM-DD') bucket, count, overdue FROM b ORDER BY bucket`,
    [...params, granularity],
  );
  return {
    granularity,
    points: rows.rows.map((x) => ({
      bucket: x.bucket,
      count: Number(x.count),
      overdue: Number(x.overdue),
    })),
  };
}
