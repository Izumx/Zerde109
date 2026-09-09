import { z } from "zod";
import { THEME_CODES } from "@zerde/types";
import type { RangeFilter } from "@zerde/types";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const zRange = z.object({
  region: z.string().min(1).optional(),
  theme: z.enum(THEME_CODES as [string, ...string[]]).optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
});

export const zPagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export function parseRange(q: unknown): RangeFilter {
  return zRange.parse(q) as RangeFilter;
}

/** SQL-фрагмент `WHERE` + параметры из RangeFilter (для repo). */
export function rangeWhere(r: RangeFilter, startIdx = 1): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = startIdx;
  if (r.region) { parts.push(`region = $${i++}`); params.push(r.region); }
  if (r.theme) { parts.push(`theme = $${i++}`); params.push(r.theme); }
  if (r.from) { parts.push(`created_at >= $${i++}`); params.push(`${r.from}T00:00:00+05:00`); }
  if (r.to) { parts.push(`created_at < ($${i++}::date + interval '1 day')`); params.push(r.to); }
  return { clause: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}
