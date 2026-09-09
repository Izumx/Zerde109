import type { NlQueryResult } from "@zerde/types";
import type { ParsedIntent } from "./intents";

export interface SqlBuildResult {
  sql: string;
  params: unknown[];
  chart: NlQueryResult["chart"];
  shape: "value" | "rows";
}

export function buildSql(intent: ParsedIntent): SqlBuildResult {
  switch (intent.kind) {
    case "count_by_theme_region_period": {
      const params: unknown[] = [intent.days, intent.theme];
      let regionClause = "";
      if (intent.region) {
        params.push(intent.region);
        regionClause = ` AND region = $${params.length}`;
      }
      const sql = `SELECT count(*)::int AS count
       FROM appeals
      WHERE created_at >= ((SELECT coalesce(max(created_at), now()) FROM appeals) - ($1 || ' days')::interval)
        AND theme = $2${regionClause}`;
      return { sql, params, chart: null, shape: "value" };
    }

    case "top_themes": {
      const params: unknown[] = [intent.days];
      let regionClause = "";
      if (intent.region) {
        params.push(intent.region);
        regionClause = ` AND region = $${params.length}`;
      }
      params.push(intent.n);
      const limitParam = `$${params.length}`;

      const sql = `SELECT theme, count(*)::int AS count
       FROM appeals
      WHERE created_at >= ((SELECT coalesce(max(created_at), now()) FROM appeals) - ($1 || ' days')::interval)${regionClause}
      GROUP BY theme
      ORDER BY count DESC
      LIMIT ${limitParam}`;
      return {
        sql,
        params,
        chart: { type: "bar", x: "theme", y: "count" },
        shape: "rows",
      };
    }

    case "theme_dynamics": {
      const params: unknown[] = [intent.days, intent.theme];
      let regionClause = "";
      if (intent.region) {
        params.push(intent.region);
        regionClause = ` AND region = $${params.length}`;
      }
      const sql = `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              count(*)::int AS count
       FROM appeals
      WHERE created_at >= ((SELECT coalesce(max(created_at), now()) FROM appeals) - ($1 || ' days')::interval)
        AND theme = $2${regionClause}
      GROUP BY 1
      ORDER BY 1`;
      return {
        sql,
        params,
        chart: { type: "line", x: "day", y: "count" },
        shape: "rows",
      };
    }

    case "overdue_share_by_region": {
      const params: unknown[] = [intent.days];
      const sql = `SELECT region,
              count(*)::int AS total,
              count(*) FILTER (WHERE is_overdue)::int AS overdue,
              round(count(*) FILTER (WHERE is_overdue)::numeric / NULLIF(count(*), 0), 3)::float AS overdue_share
       FROM appeals
      WHERE created_at >= ((SELECT coalesce(max(created_at), now()) FROM appeals) - ($1 || ' days')::interval)
      GROUP BY region
      ORDER BY overdue_share DESC`;
      return {
        sql,
        params,
        chart: { type: "bar", x: "region", y: "overdue_share" },
        shape: "rows",
      };
    }

    case "compare_regions": {
      const params: unknown[] = [intent.days, intent.regionA, intent.regionB];
      let themeClause = "";
      if (intent.theme) {
        params.push(intent.theme);
        themeClause = ` AND theme = $${params.length}`;
      }
      const sql = `SELECT region, count(*)::int AS count
       FROM appeals
      WHERE created_at >= ((SELECT coalesce(max(created_at), now()) FROM appeals) - ($1 || ' days')::interval)
        AND region IN ($2, $3)${themeClause}
      GROUP BY region
      ORDER BY count DESC`;
      return {
        sql,
        params,
        chart: { type: "bar", x: "region", y: "count" },
        shape: "rows",
      };
    }
  }
}
