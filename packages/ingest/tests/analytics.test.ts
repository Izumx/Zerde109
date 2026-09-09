import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import pg from "pg";
import { runMigrations } from "../src/migrate";
import { runSeeds } from "../src/seed";
import { loadRegion } from "../src/load";
import { refreshViews } from "../src/analytics/views";
import { detectSpikes } from "../src/analytics/spikes";
import { seasonalNaive } from "../src/analytics/forecasts";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/zerde109_test";
let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations(pool);
  await runSeeds(pool);
  const dir = mkdtempSync(join(tmpdir(), "zerde-an-"));
  writeFileSync(
    join(dir, "akmola.csv"),
    readFileSync(new URL("../fixtures/akmola.sample.csv", import.meta.url)),
  );
  await loadRegion(pool, dir, "akmola");
});
afterAll(async () => {
  await pool.end();
});

describe("views", () => {
  test("refreshViews populates mv_region_totals and mv_daily_counts", async () => {
    await refreshViews(pool);
    const rt = await pool.query("SELECT count FROM mv_region_totals WHERE region='akmola'");
    expect(rt.rows[0].count).toBe(3);
    const dc = await pool.query(
      "SELECT coalesce(sum(count),0)::int s FROM mv_daily_counts WHERE region='akmola'",
    );
    expect(dc.rows[0].s).toBe(3);
  });
});

describe("detectSpikes (pure)", () => {
  const flat = Array.from({ length: 40 }, (_, i) => ({
    day: `2025-02-${String(i + 1).padStart(2, "0")}`,
    count: 5,
  }));

  test("flat series -> no spikes", () => {
    expect(detectSpikes(flat)).toEqual([]);
  });

  test("one 10x day after a stable baseline -> one spike", () => {
    const s = flat.map((p, i) => (i === 35 ? { ...p, count: 50 } : p));
    const out = detectSpikes(s);
    expect(out).toHaveLength(1);
    expect(out[0]!.day).toBe(s[35]!.day);
    expect(out[0]!.ratio).toBeGreaterThan(8);
    expect(out[0]!.zscore).toBeGreaterThanOrEqual(2.5);
    expect(["low", "medium", "high"]).toContain(out[0]!.severity);
  });

  test("needs at least 7 prior points", () => {
    const short = [
      { day: "2025-01-01", count: 1 },
      { day: "2025-01-02", count: 99 },
    ];
    expect(detectSpikes(short)).toEqual([]);
  });
});

describe("seasonalNaive (pure)", () => {
  const history = Array.from({ length: 24 }, (_, i) => {
    const month = new Date(Date.UTC(2023, i, 1)).toISOString().slice(0, 10);
    const seasonal = 100 + 40 * Math.sin((i / 12) * 2 * Math.PI);
    return { month, count: Math.round(seasonal + i * 2) };
  });

  test("returns `horizon` rows with ordered bounds", () => {
    const fc = seasonalNaive(history, 3);
    expect(fc).toHaveLength(3);
    for (const p of fc) {
      expect(p.yhatLower).toBeLessThanOrEqual(p.yhat);
      expect(p.yhat).toBeLessThanOrEqual(p.yhatUpper);
      expect(p.yhat).toBeGreaterThan(0);
      expect(p.method).toBe("seasonal-naive");
      expect(p.month).toMatch(/^\d{4}-\d{2}-01$/);
    }
  });

  test("first forecast month is the month after the last history month", () => {
    const fc = seasonalNaive(history, 1);
    expect(fc[0]!.month).toBe("2025-01-01");
  });

  test("short history (<13 months) -> mean-fallback", () => {
    const fc = seasonalNaive(history.slice(0, 8), 2);
    expect(fc).toHaveLength(2);
    expect(fc[0]!.method).toBe("mean-fallback");
  });

  test("empty history -> no rows", () => {
    expect(seasonalNaive([], 3)).toEqual([]);
  });
});
