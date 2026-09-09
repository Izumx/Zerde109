import { afterAll, beforeAll, expect, test } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate";
import { runSeeds } from "../src/seed";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/zerde109_test";
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

test("seeds load 7 active regions, 17 themes, 16 services", async () => {
  const active = await pool.query("SELECT count(*)::int n FROM regions WHERE is_active");
  const themes = await pool.query("SELECT count(*)::int n FROM themes");
  const services = await pool.query("SELECT count(*)::int n FROM services");
  expect(active.rows[0].n).toBe(7);
  expect(themes.rows[0].n).toBe(17);
  expect(services.rows[0].n).toBe(16);
});

test("all 20 regions present (13 inactive placeholders toward the full set)", async () => {
  const total = await pool.query("SELECT count(*)::int n FROM regions");
  expect(total.rows[0].n).toBe(20);
});

test("runSeeds is idempotent", async () => {
  await runSeeds(pool);
  const themes = await pool.query("SELECT count(*)::int n FROM themes");
  expect(themes.rows[0].n).toBe(17);
});
