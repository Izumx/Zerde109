import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate";
import { runSeeds } from "../src/seed";
import { loadRegion } from "../src/load";
import { refreshViews } from "../src/analytics/views";
import { runChecks } from "../src/verify";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/zerde109_test";
let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  await runSeeds(pool);
  const dir = mkdtempSync(join(tmpdir(), "zerde-vf-"));
  writeFileSync(
    join(dir, "akmola.csv"),
    readFileSync(new URL("../fixtures/akmola.sample.csv", import.meta.url)),
  );
  await loadRegion(pool, dir, "akmola");
  await refreshViews(pool);
});
afterAll(async () => {
  await pool.end();
});

test("runChecks returns named checks with boolean ok + string detail", async () => {
  const checks = await runChecks(pool);
  const names = checks.map((c) => c.name);
  expect(names).toEqual(
    expect.arrayContaining(["all 7 regions present and non-empty", "spikes non-empty"]),
  );
  expect(checks.every((c) => typeof c.ok === "boolean" && typeof c.detail === "string")).toBe(true);
});
