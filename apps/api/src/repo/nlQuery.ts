import type pg from "pg";
import type { NlQueryResult } from "@zerde/types";
import { unrecognized } from "../errors";
import { parseIntent } from "../nl/intents";
import { buildSql } from "../nl/sqlBuilder";

export async function runNlQuery(pool: pg.Pool, query: string): Promise<NlQueryResult> {
  const intent = parseIntent(query);
  if (!intent) {
    throw unrecognized(
      "Не удалось распознать запрос. Примеры: «Сколько обращений по воде в Акмолинской области за месяц», «Топ 5 тем за 30 дней», «Динамика по дорогам за месяц», «Доля просрочек по регионам», «Сравнить Акмолу и Алматы по воде»",
    );
  }

  const { sql, params, chart, shape } = buildSql(intent);
  const res = await pool.query<Record<string, string | number>>(sql, params);

  let value: number | null = null;
  let rows: Record<string, string | number>[] = [];
  let summary = "";

  if (shape === "value") {
    value = Number(res.rows[0]?.count ?? 0);
    summary = `Найдено обращений: ${value}`;
  } else {
    rows = res.rows.map((r) => {
      const rowObj: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(r)) {
        rowObj[k] =
          typeof v === "string" &&
          !isNaN(Number(v)) &&
          k !== "day" &&
          k !== "theme" &&
          k !== "region"
            ? Number(v)
            : v;
      }
      return rowObj;
    });
    summary = `Получено строк: ${rows.length}`;
  }

  return {
    intent: intent.kind,
    sql,
    value,
    rows,
    chart,
    summary,
  };
}
