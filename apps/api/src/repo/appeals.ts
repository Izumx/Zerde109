import type pg from "pg";
import type {
  Appeal,
  AppealListItem,
  AppealStatus,
  Paginated,
  Priority,
  RangeFilter,
} from "@zerde/types";
import { rangeWhere } from "../schema";

export type ListOpts = RangeFilter & {
  status?: AppealStatus;
  priority?: Priority;
  search?: string;
  page: number;
  pageSize: number;
  sort: "created_desc" | "created_asc";
};

export async function listAppeals(
  pool: pg.Pool,
  opts: ListOpts,
): Promise<Paginated<AppealListItem>> {
  const { clause: baseClause, params } = rangeWhere(opts);
  const extraParts: string[] = [];

  if (opts.status) {
    params.push(opts.status);
    extraParts.push(`status = $${params.length}`);
  }
  if (opts.priority) {
    params.push(opts.priority);
    extraParts.push(`priority = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    extraParts.push(`search_text ILIKE $${params.length}`);
  }

  let fullClause = baseClause;
  if (extraParts.length > 0) {
    fullClause = fullClause
      ? `${fullClause} AND ${extraParts.join(" AND ")}`
      : `WHERE ${extraParts.join(" AND ")}`;
  }

  const countRes = await pool.query<{ total: string }>(
    `SELECT count(*) total FROM appeals ${fullClause}`,
    params,
  );
  const total = Number(countRes.rows[0]?.total ?? 0);

  const sortOrder = opts.sort === "created_asc" ? "ASC" : "DESC";
  const offset = (opts.page - 1) * opts.pageSize;
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const itemsRes = await pool.query<{
    id: string;
    source_id: string;
    region: string;
    created_at: Date;
    theme: string;
    status: string;
    priority: string;
    channel: string | null;
    preview: string;
    is_overdue: boolean;
  }>(
    `SELECT id, source_id, region, created_at, theme, status, priority, channel,
            left(coalesce(raw_category,'') || ' — ' || coalesce(subcategory,''), 140) AS preview,
            is_overdue
       FROM appeals ${fullClause}
      ORDER BY created_at ${sortOrder}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, opts.pageSize, offset],
  );

  const items: AppealListItem[] = itemsRes.rows.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    region: row.region,
    createdAt: row.created_at.toISOString(),
    theme: row.theme as never,
    status: row.status as never,
    priority: row.priority as never,
    channel: (row.channel as never) ?? null,
    preview: row.preview,
    isOverdue: row.is_overdue,
  }));

  return {
    items,
    page: opts.page,
    pageSize: opts.pageSize,
    total,
  };
}

export async function getAppeal(pool: pg.Pool, id: string): Promise<Appeal | null> {
  const res = await pool.query<{
    id: string;
    source_id: string;
    region: string;
    district: string | null;
    locality: string | null;
    address: string | null;
    lat: string | null;
    lon: string | null;
    created_at: Date;
    closed_at: Date | null;
    deadline_at: Date | null;
    theme: string;
    raw_category: string | null;
    subcategory: string | null;
    service_org: string | null;
    status: string;
    raw_status: string | null;
    appeal_type: string | null;
    channel: string | null;
    language: string;
    priority: string;
    is_overdue: boolean;
    sla_days: number | null;
    grade: number | null;
    operator: string | null;
    resolution: string | null;
    search_text: string;
  }>("SELECT * FROM appeals WHERE id = $1", [id]);

  const row = res.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    sourceId: row.source_id,
    region: row.region,
    district: row.district,
    locality: row.locality,
    address: row.address,
    lat: row.lat !== null ? Number(row.lat) : null,
    lon: row.lon !== null ? Number(row.lon) : null,
    createdAt: row.created_at.toISOString(),
    closedAt: row.closed_at ? row.closed_at.toISOString() : null,
    deadlineAt: row.deadline_at ? row.deadline_at.toISOString() : null,
    theme: row.theme as never,
    rawCategory: row.raw_category,
    subcategory: row.subcategory,
    serviceOrg: row.service_org,
    status: row.status as never,
    rawStatus: row.raw_status,
    appealType: (row.appeal_type as never) ?? null,
    channel: (row.channel as never) ?? null,
    language: row.language as never,
    priority: row.priority as never,
    isOverdue: row.is_overdue,
    slaDays: row.sla_days !== null ? Number(row.sla_days) : null,
    grade: row.grade !== null ? Number(row.grade) : null,
    operator: row.operator,
    resolution: row.resolution,
    searchText: row.search_text,
  };
}
