CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_counts AS
SELECT region, theme,
       date_trunc('day', created_at)::date AS day,
       count(*)::int AS count,
       count(*) FILTER (WHERE is_overdue)::int AS overdue_count,
       avg(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600.0)
         FILTER (WHERE closed_at IS NOT NULL) AS avg_close_hours
FROM appeals
GROUP BY region, theme, day;
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_counts_key ON mv_daily_counts (region, theme, day);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_theme_totals AS
SELECT region, theme, count(*)::int AS count,
       count(*) FILTER (WHERE is_overdue)::int AS overdue_count
FROM appeals GROUP BY region, theme;
CREATE UNIQUE INDEX IF NOT EXISTS mv_theme_totals_key ON mv_theme_totals (region, theme);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_region_totals AS
SELECT region,
       count(*)::int AS count,
       count(*) FILTER (WHERE status IN ('new','routed','in_progress'))::int AS open_count,
       count(*) FILTER (WHERE is_overdue)::int AS overdue_count,
       avg(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600.0)
         FILTER (WHERE closed_at IS NOT NULL) AS avg_close_hours
FROM appeals GROUP BY region;
CREATE UNIQUE INDEX IF NOT EXISTS mv_region_totals_key ON mv_region_totals (region);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_operator_load AS
SELECT region, operator, date_trunc('day', created_at)::date AS day, count(*)::int AS handled
FROM appeals WHERE operator IS NOT NULL
GROUP BY region, operator, day;
CREATE UNIQUE INDEX IF NOT EXISTS mv_operator_load_key ON mv_operator_load (region, operator, day);
