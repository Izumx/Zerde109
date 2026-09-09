import { createReadStream } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse";
import type pg from "pg";
import type { NormalizedAppeal } from "./mappers/types";
import { REGION_MAPPERS } from "./mappers/index";
import { loadThemeMap } from "./themeMap";

export type LoadStats = {
  region: string;
  read: number;
  mapped: number;
  rejected: number;
  upserted: number;
  rejectSamples: string[];
};

const COLS = [
  "id", "source_id", "region", "district", "locality", "address", "lat", "lon",
  "created_at", "closed_at", "deadline_at", "theme", "raw_category", "subcategory",
  "service_org", "status", "raw_status", "appeal_type", "channel", "language",
  "priority", "is_overdue", "sla_days", "grade", "operator", "resolution", "search_text",
] as const;

function rowValues(region: string, a: NormalizedAppeal): unknown[] {
  return [
    `${region}:${a.sourceId}`, a.sourceId, a.region, a.district, a.locality, a.address,
    a.lat, a.lon, a.createdAt.toISOString(), a.closedAt?.toISOString() ?? null,
    a.deadlineAt?.toISOString() ?? null, a.theme, a.rawCategory, a.subcategory,
    a.serviceOrg, a.status, a.rawStatus, a.appealType, a.channel, a.language,
    a.priority, a.isOverdue, a.slaDays, a.grade, a.operator, a.resolution, a.searchText,
  ];
}

export async function upsertBatch(
  pool: pg.Pool,
  region: string,
  appeals: NormalizedAppeal[],
): Promise<number> {
  if (appeals.length === 0) return 0;
  const perRow = COLS.length;
  const tuples: string[] = [];
  const params: unknown[] = [];
  appeals.forEach((a, i) => {
    const base = i * perRow;
    tuples.push(`(${COLS.map((_, j) => `$${base + j + 1}`).join(",")})`);
    params.push(...rowValues(region, a));
  });
  const updates = COLS.filter((c) => c !== "id")
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");
  const sql =
    `INSERT INTO appeals (${COLS.join(",")}) VALUES ${tuples.join(",")} ` +
    `ON CONFLICT (id) DO UPDATE SET ${updates}, ingested_at = now()`;
  const res = await pool.query(sql, params as unknown[]);
  return res.rowCount ?? 0;
}

export async function loadRegion(
  pool: pg.Pool,
  dataDir: string,
  region: string,
  opts: { limit?: number; batchSize?: number } = {},
): Promise<LoadStats> {
  const cfg = REGION_MAPPERS[region];
  if (!cfg) throw new Error(`unknown region: ${region}`);
  const classify = await loadThemeMap(pool);
  const batchSize = opts.batchSize ?? 1000;
  const stats: LoadStats = {
    region, read: 0, mapped: 0, rejected: 0, upserted: 0, rejectSamples: [],
  };
  let buffer: NormalizedAppeal[] = [];

  const flush = async (): Promise<void> => {
    if (buffer.length) {
      stats.upserted += await upsertBatch(pool, region, buffer);
      buffer = [];
    }
  };

  for (const file of cfg.files) {
    const parser = createReadStream(join(dataDir, file)).pipe(parse(cfg.csv));
    for await (const rec of parser as AsyncIterable<Record<string, string>>) {
      if (opts.limit && stats.read >= opts.limit) break;
      stats.read += 1;
      const res = cfg.mapper.map(rec, classify);
      if (!res.ok) {
        stats.rejected += 1;
        if (stats.rejectSamples.length < 10) stats.rejectSamples.push(res.reason);
        continue;
      }
      stats.mapped += 1;
      buffer.push(res.appeal);
      if (buffer.length >= batchSize) await flush();
    }
    if (opts.limit && stats.read >= opts.limit) break;
  }
  await flush();
  return stats;
}
