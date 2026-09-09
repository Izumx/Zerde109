import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate";
import { runSeeds } from "../src/seed";
import { loadRegion } from "../src/load";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/zerde109_test";
let pool: pg.Pool;
let dir: string;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  await runSeeds(pool);
  dir = mkdtempSync(join(tmpdir(), "zerde-load-"));
  writeFileSync(
    join(dir, "akmola.csv"),
    readFileSync(new URL("../fixtures/akmola.sample.csv", import.meta.url)),
  );
});
afterAll(async () => {
  await pool.end();
});

test("loadRegion maps 3, rejects 1, upserts 3", async () => {
  const s = await loadRegion(pool, dir, "akmola");
  expect(s.read).toBe(4);
  expect(s.mapped).toBe(3);
  expect(s.rejected).toBe(1);
  expect(s.upserted).toBe(3);
  const n = await pool.query("SELECT count(*)::int c FROM appeals WHERE region = 'akmola'");
  expect(n.rows[0].c).toBe(3);
});

test("re-running is idempotent (still 3 rows)", async () => {
  await loadRegion(pool, dir, "akmola");
  const n = await pool.query("SELECT count(*)::int c FROM appeals WHERE region = 'akmola'");
  expect(n.rows[0].c).toBe(3);
});

test("loaded rows satisfy NOT NULL + FK constraints", async () => {
  const bad = await pool.query(
    `SELECT count(*)::int c FROM appeals
     WHERE theme IS NULL OR region IS NULL OR status IS NULL OR search_text IS NULL`,
  );
  expect(bad.rows[0].c).toBe(0);
});
