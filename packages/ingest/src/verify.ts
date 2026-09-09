import type pg from "pg";
import "./loadEnv";
import { getPool } from "./db";
import { isMain } from "./paths";

export type Check = { name: string; ok: boolean; detail: string };

export async function runChecks(pool: pg.Pool): Promise<Check[]> {
  const checks: Check[] = [];
  const one = async (sql: string): Promise<number> => Number((await pool.query(sql)).rows[0].v);

  const total = await one("SELECT count(*) v FROM appeals");
  checks.push({
    name: "total appeals in [900k, 1.1M]",
    ok: total >= 900_000 && total <= 1_100_000,
    detail: `${total}`,
  });

  const regions = await pool.query(
    "SELECT region, count(*)::int c FROM appeals GROUP BY region ORDER BY region",
  );
  checks.push({
    name: "all 7 regions present and non-empty",
    ok: regions.rows.length === 7 && regions.rows.every((r) => r.c > 0),
    detail: regions.rows.map((r) => `${r.region}:${r.c}`).join(" "),
  });

  const otherShare = await one(
    "SELECT round(100.0 * count(*) FILTER (WHERE theme='other') / greatest(count(*),1)) v FROM appeals",
  );
  checks.push({ name: "theme='other' share < 45%", ok: otherShare < 45, detail: `${otherShare}%` });

  const span = await pool.query(
    "SELECT extract(year from min(created_at))::int lo, extract(year from max(created_at))::int hi FROM appeals",
  );
  checks.push({
    name: "date span covers 2021..2025",
    ok: span.rows[0].lo <= 2021 && span.rows[0].hi >= 2025,
    detail: `${span.rows[0].lo}..${span.rows[0].hi}`,
  });

  const langs = await one("SELECT count(DISTINCT language) v FROM appeals");
  checks.push({ name: "both kk and ru present", ok: langs === 2, detail: `${langs} langs` });

  const mvRegions = await one("SELECT count(*) v FROM mv_region_totals");
  checks.push({ name: "mv_region_totals has 7 rows", ok: mvRegions === 7, detail: `${mvRegions}` });

  const nSpikes = await one("SELECT count(*) v FROM spikes");
  checks.push({ name: "spikes non-empty", ok: nSpikes > 0, detail: `${nSpikes}` });

  const nForecasts = await one("SELECT count(*) v FROM forecasts");
  checks.push({ name: "forecasts non-empty", ok: nForecasts > 0, detail: `${nForecasts}` });

  const nulls = await one(
    `SELECT count(*) v FROM appeals
      WHERE theme IS NULL OR region IS NULL OR status IS NULL
         OR language IS NULL OR priority IS NULL OR search_text IS NULL`,
  );
  checks.push({ name: "no NULLs in NOT NULL columns", ok: nulls === 0, detail: `${nulls} bad rows` });

  return checks;
}

if (isMain(import.meta.url)) {
  const pool = getPool();
  runChecks(pool)
    .then(async (checks) => {
      for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}  (${c.detail})`);
      await pool.end();
      if (checks.some((c) => !c.ok)) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
