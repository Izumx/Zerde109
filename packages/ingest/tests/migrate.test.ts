import { afterAll, beforeAll, expect, test } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/zerde109_test";
let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
});
afterAll(async () => {
  await pool.end();
});

test("runMigrations applies all files once and is idempotent", async () => {
  const first = await runMigrations(pool);
  expect(first).toContain("0001_init.sql");

  const second = await runMigrations(pool);
  expect(second).toEqual([]);

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'appeals'`,
  );
  const names = cols.rows.map((r) => r.column_name);
  expect(names).toEqual(
    expect.arrayContaining(["id", "region", "theme", "status", "search_text"]),
  );
});
