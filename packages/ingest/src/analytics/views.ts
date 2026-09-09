import type pg from "pg";

export const MATERIALIZED_VIEWS = [
  "mv_daily_counts", "mv_theme_totals", "mv_region_totals", "mv_operator_load",
] as const;

/**
 * Рефреш всех матвьюх. Первый рефреш после создания невозможно сделать
 * `CONCURRENTLY` — падаем на обычный `REFRESH` через try/catch.
 */
export async function refreshViews(pool: pg.Pool): Promise<void> {
  for (const view of MATERIALIZED_VIEWS) {
    try {
      await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
    } catch {
      await pool.query(`REFRESH MATERIALIZED VIEW ${view}`);
    }
  }
}
