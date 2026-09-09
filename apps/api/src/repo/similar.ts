import type pg from "pg";
import type { DuplicateInfo, SimilarAppeal, ThemeCode } from "@zerde/types";
import { notFound } from "../errors";

export async function getSimilar(
  pool: pg.Pool,
  id: string,
  k = 8,
): Promise<SimilarAppeal[]> {
  const targetRes = await pool.query<{
    region: string;
    theme: string;
    search_text: string;
  }>("SELECT region, theme, search_text FROM appeals WHERE id = $1", [id]);

  const target = targetRes.rows[0];
  if (!target) throw notFound(`Appeal ${id} not found`);

  const res = await pool.query<{
    id: string;
    created_at: Date;
    region: string;
    theme: string;
    preview: string;
    service_org: string | null;
    resolution: string | null;
    days_to_close: number | null;
    similarity: number;
  }>(
    `SELECT id, created_at, region, theme,
            left(coalesce(raw_category,'') || ' — ' || coalesce(subcategory,''), 140) AS preview,
            service_org, resolution,
            EXTRACT(day FROM (closed_at - created_at))::int AS days_to_close,
            similarity(search_text, $2) AS similarity
       FROM appeals
      WHERE id <> $1 AND theme = $3 AND region = $4
      ORDER BY similarity(search_text, $2) DESC
      LIMIT $5`,
    [id, target.search_text, target.theme, target.region, k],
  );

  return res.rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at.toISOString(),
    region: r.region,
    theme: r.theme as ThemeCode,
    preview: r.preview,
    serviceOrg: r.service_org,
    resolution: r.resolution,
    daysToClose: r.days_to_close !== null ? Number(r.days_to_close) : null,
    similarity: Number(r.similarity),
  }));
}

export async function getDuplicates(pool: pg.Pool, id: string): Promise<DuplicateInfo> {
  const targetRes = await pool.query<{
    region: string;
    theme: string;
    address: string | null;
    search_text: string;
  }>("SELECT region, theme, address, search_text FROM appeals WHERE id = $1", [id]);

  const target = targetRes.rows[0];
  if (!target) throw notFound(`Appeal ${id} not found`);

  const nearRes = await pool.query<{
    id: string;
    created_at: Date;
    region: string;
    theme: string;
    preview: string;
    service_org: string | null;
    resolution: string | null;
    days_to_close: number | null;
    similarity: number;
  }>(
    `SELECT id, created_at, region, theme,
            left(coalesce(raw_category,'') || ' — ' || coalesce(subcategory,''), 140) AS preview,
            service_org, resolution,
            EXTRACT(day FROM (closed_at - created_at))::int AS days_to_close,
            similarity(search_text, $2) AS similarity
       FROM appeals
      WHERE id <> $1 AND theme = $3 AND region = $4
        AND status IN ('new', 'routed', 'in_progress')
        AND similarity(search_text, $2) > 0.6
      ORDER BY similarity DESC
      LIMIT 5`,
    [id, target.search_text, target.theme, target.region],
  );

  let repeats: SimilarAppeal[] = [];
  if (target.address && target.address.trim()) {
    const repeatRes = await pool.query<{
      id: string;
      created_at: Date;
      region: string;
      theme: string;
      preview: string;
      service_org: string | null;
      resolution: string | null;
      days_to_close: number | null;
    }>(
      `SELECT id, created_at, region, theme,
              left(coalesce(raw_category,'') || ' — ' || coalesce(subcategory,''), 140) AS preview,
              service_org, resolution,
              EXTRACT(day FROM (closed_at - created_at))::int AS days_to_close
         FROM appeals
        WHERE id <> $1
          AND address = $2
          AND region = $3
        ORDER BY created_at DESC
        LIMIT 5`,
      [id, target.address, target.region],
    );

    repeats = repeatRes.rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at.toISOString(),
      region: r.region,
      theme: r.theme as ThemeCode,
      preview: r.preview,
      serviceOrg: r.service_org,
      resolution: r.resolution,
      daysToClose: r.days_to_close !== null ? Number(r.days_to_close) : null,
      similarity: 1.0,
    }));
  }

  const nearDuplicates = nearRes.rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at.toISOString(),
    region: r.region,
    theme: r.theme as ThemeCode,
    preview: r.preview,
    serviceOrg: r.service_org,
    resolution: r.resolution,
    daysToClose: r.days_to_close !== null ? Number(r.days_to_close) : null,
    similarity: Number(r.similarity),
  }));

  return {
    nearDuplicates,
    repeats,
  };
}
