import type pg from "pg";
import type { BreakdownDim, BreakdownRow, RangeFilter } from "@zerde/types";
import { rangeWhere } from "../schema";
import { getMeta } from "./meta";

const COL: Record<BreakdownDim, string> = {
  region: "region",
  theme: "theme",
  status: "status",
  channel: "channel",
};

export async function getBreakdown(
  pool: pg.Pool,
  r: RangeFilter,
  dim: BreakdownDim,
): Promise<BreakdownRow[]> {
  const col = COL[dim];
  const { clause, params } = rangeWhere(r);
  const cur = await pool.query<{ key: string | null; count: string; overdue: string }>(
    `SELECT ${col} AS key, count(*) count, count(*) FILTER (WHERE is_overdue) overdue
       FROM appeals ${clause} GROUP BY ${col} ORDER BY count DESC`,
    params,
  );
  const meta = await getMeta(pool);
  const labelOf = (key: string | null): string => {
    if (key === null) return "—";
    if (dim === "theme") return meta.themes.find((t) => t.code === key)?.nameRu ?? key;
    if (dim === "region") return meta.regions.find((x) => x.code === key)?.nameRu ?? key;
    if (dim === "status") return meta.statuses.find((x) => x.code === key)?.labelRu ?? key;
    return meta.channels.find((x) => x.code === key)?.labelRu ?? key;
  };
  return cur.rows.map((x) => ({
    key: x.key ?? "—",
    label: labelOf(x.key),
    count: Number(x.count),
    overdue: Number(x.overdue),
    deltaPct: 0,
  }));
}
