import type pg from "pg";
import type { ForecastResponse, ForecastRow, ThemeCode } from "@zerde/types";

export async function getForecast(
  pool: pg.Pool,
  region: string,
  theme: ThemeCode,
): Promise<ForecastResponse> {
  const historyRes = await pool.query<{ month: string; count: string }>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM-DD') AS month,
            count(*)::int AS count
       FROM appeals
      WHERE region = $1 AND theme = $2
      GROUP BY 1
      ORDER BY 1
      LIMIT 24`,
    [region, theme],
  );

  const forecastRes = await pool.query<{
    month: string;
    yhat: number;
    yhat_lower: number;
    yhat_upper: number;
    method: string;
  }>(
    `SELECT to_char(month, 'YYYY-MM-DD') AS month,
            yhat, yhat_lower, yhat_upper, method
       FROM forecasts
      WHERE region = $1 AND theme = $2
      ORDER BY month`,
    [region, theme],
  );

  const history = historyRes.rows.map((r) => ({
    month: r.month,
    count: Number(r.count),
  }));

  const forecast: ForecastRow[] = forecastRes.rows.map((r) => ({
    month: r.month,
    yhat: Number(r.yhat),
    yhatLower: Number(r.yhat_lower),
    yhatUpper: Number(r.yhat_upper),
  }));

  const method = forecastRes.rows[0]?.method ?? "seasonal-naive";

  return {
    region,
    theme,
    method,
    history,
    forecast,
  };
}
