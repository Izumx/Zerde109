import { afterAll, beforeAll, expect, test } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate";
import { runSeeds } from "../src/seed";
import { computeModelEval } from "../src/analytics/modelEval";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/zerde109_test";

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  await runSeeds(pool);
});

afterAll(async () => {
  await pool.end();
});

test("computeModelEval returns stats and populates tables", async () => {
  const sampleAppeals = [
    ["t1", "akmola", "Уличное освещение", "Не горит фонарь", "lighting"],
    ["t2", "akmola", "Холодное водоснабжение", "Отсутствие воды", "water"],
    ["t3", "almaty", "Теплоснабжение", "Отопление не работает", "heating"],
    ["t4", "almaty", "Дороги", "Яма на проезжей части", "roads"],
    ["t5", "almaty", "Твердые бытовые отходы", "Вывоз мусора", "waste"],
  ];

  for (const [id, region, cat, subcat, theme] of sampleAppeals) {
    await pool.query(
      `INSERT INTO appeals (id, source_id, region, created_at, theme, raw_category, subcategory, status, language, priority, is_overdue, search_text)
       VALUES ($1, $1, $2, now(), $5, $3, $4, 'new', 'ru', 'low', false, 'test')`,
      [id, region, cat, subcat, theme],
    );
  }

  const stats = await computeModelEval(pool);
  expect(stats.nHoldout).toBeGreaterThan(0);
  expect(stats.accuracy).toBeGreaterThan(0.6);
  expect(stats.macroF1).toBeGreaterThan(0);

  const ov = await pool.query("SELECT * FROM model_eval_overview");
  expect(ov.rows).toHaveLength(1);
  expect(ov.rows[0].method).toContain("keyword-baseline");

  const th = await pool.query("SELECT * FROM model_eval_themes");
  expect(th.rows.length).toBeGreaterThan(0);
});
