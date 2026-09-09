import pg from "pg";
import type { FastifyInstance } from "fastify";
import { runMigrations } from "@zerde/ingest/migrate";
import { runSeeds } from "@zerde/ingest/seed";
import { refreshViews } from "@zerde/ingest/analytics/views";
import { computeSpikes } from "@zerde/ingest/analytics/spikes";
import { computeForecasts } from "@zerde/ingest/analytics/forecasts";
import { THEME_CODES } from "@zerde/types";
import { buildServer } from "../src/server";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/zerde109_test";

const REGIONS = ["akmola", "almaty", "east-kazakhstan", "karaganda", "kostanay", "turkestan", "pavlodar"];
const APPEAL_COLS = [
  "id", "source_id", "region", "district", "locality", "address", "lat", "lon",
  "created_at", "closed_at", "deadline_at", "theme", "raw_category", "subcategory",
  "service_org", "status", "raw_status", "appeal_type", "channel", "language",
  "priority", "is_overdue", "sla_days", "grade", "operator", "resolution", "search_text",
];

export async function seedAppeals(pool: pg.Pool): Promise<void> {
  const themes = THEME_CODES.slice(0, 10);
  const rows: unknown[][] = [];
  let n = 0;
  for (let ri = 0; ri < REGIONS.length; ri++) {
    for (let ti = 0; ti < 5; ti++) {
      n++;
      const region = REGIONS[ri]!;
      const theme = themes[(ri + ti) % themes.length]!;
      const month = 1 + ((ri + ti) % 12);
      const created = `2024-${String(month).padStart(2, "0")}-1${ti} 09:00:00+05:00`;
      const done = ti % 2 === 0;
      const overdue = ti === 1;
      const addr = ti === 4 ? "ул. Повторная 1" : `ул. Тестовая ${n}`;
      rows.push([
        `${region}:t${n}`, `t${n}`, region, null, "Тестгород", addr, null, null,
        created, done ? `2024-${String(month).padStart(2, "0")}-2${ti} 10:00:00+05:00` : null,
        `2024-${String(month).padStart(2, "0")}-15 00:00:00+05:00`,
        theme, "тест-категория", "тест-подкатегория", ti === 0 ? "ТОО Тест" : null,
        done ? "done" : ti === 3 ? "in_progress" : "routed", null,
        ti % 3 === 0 ? "incident" : "consultation",
        ["ekc109", "whatsapp", "mobile", "web"][ti % 4], ti % 5 === 0 ? "kk" : "ru",
        overdue ? "high" : "low", overdue, 5, null, ti === 3 ? "op1" : null,
        done ? "Проблема устранена" : null,
        `тест ${theme} ${addr}`,
      ]);
      // повтор: тот же адрес, закрыт недавно
      if (ti === 4) {
        n++;
        rows.push([
          `${region}:t${n}`, `t${n}`, region, null, "Тестгород", addr, null, null,
          `2025-05-0${ri + 1} 09:00:00+05:00`, `2025-05-1${ri + 1} 09:00:00+05:00`, null,
          theme, "тест-категория", "тест-подкатегория", null,
          "done", null, "complaint", "ekc109", "ru", "medium", false, 7, null, null,
          "Вопрос решен консультацией", `повтор ${theme} ${addr}`,
        ]);
      }
    }
  }
  const per = APPEAL_COLS.length;
  const tuples = rows.map(
    (_, i) => `(${APPEAL_COLS.map((__, j) => `$${i * per + j + 1}`).join(",")})`,
  );
  await pool.query(
    `INSERT INTO appeals (${APPEAL_COLS.join(",")}) VALUES ${tuples.join(",")}`,
    rows.flat(),
  );
}

export async function makeTestServer(): Promise<{ app: FastifyInstance; pool: pg.Pool }> {
  process.env.DATABASE_URL = url;
  const pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  await runSeeds(pool);
  await seedAppeals(pool);
  await refreshViews(pool);
  await computeSpikes(pool);
  await computeForecasts(pool);
  const app = await buildServer();
  return { app, pool };
}
