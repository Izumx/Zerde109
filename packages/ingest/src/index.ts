import { resolve } from "node:path";
import type pg from "pg";
import "./loadEnv";
import { getPool } from "./db";
import { runMigrations } from "./migrate";
import { runSeeds } from "./seed";
import { loadRegion, type LoadStats } from "./load";
import { REGION_CODES, REGION_MAPPERS } from "./mappers/index";
import { isMain, REPO_ROOT } from "./paths";

export interface IngestArgs {
  regions: string[];
  limit?: number;
  skipAnalytics: boolean;
}

export function parseArgs(argv: string[]): IngestArgs {
  const regions: string[] = [];
  let limit: number | undefined;
  let skipAnalytics = false;
  for (const arg of argv) {
    if (arg === "--all") {
      regions.push(...REGION_CODES);
    } else if (arg.startsWith("--region=")) {
      const code = arg.slice("--region=".length);
      if (!REGION_MAPPERS[code]) throw new Error(`unknown region: ${code}`);
      regions.push(code);
    } else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
    } else if (arg === "--skip-analytics") {
      skipAnalytics = true;
    }
  }
  if (regions.length === 0) throw new Error("pass --all or --region=<code>");
  return { regions: [...new Set(regions)], limit, skipAnalytics };
}

function printSummary(rows: LoadStats[]): void {
  const pad = (s: string | number, n: number): string => String(s).padStart(n);
  console.log("\nregion            read    mapped  rejected  upserted");
  console.log("-".repeat(56));
  for (const r of rows) {
    console.log(
      `${r.region.padEnd(17)}${pad(r.read, 6)}${pad(r.mapped, 10)}${pad(r.rejected, 10)}${pad(r.upserted, 10)}`,
    );
    if (r.rejectSamples.length) {
      console.log(`  reject reasons: ${[...new Set(r.rejectSamples)].join("; ")}`);
    }
  }
}

async function runAnalytics(pool: pg.Pool): Promise<void> {
  const { refreshViews } = await import("./analytics/views");
  const { computeSpikes } = await import("./analytics/spikes");
  const { computeForecasts } = await import("./analytics/forecasts");
  console.log("\nrefreshing materialized views …");
  await refreshViews(pool);
  console.log("computing spikes …");
  console.log(`  ${await computeSpikes(pool)} spike rows`);
  console.log("computing forecasts …");
  console.log(`  ${await computeForecasts(pool)} forecast rows`);
}

async function main(): Promise<void> {
  const { regions, limit, skipAnalytics } = parseArgs(process.argv.slice(2));
  const dataDir = resolve(REPO_ROOT, process.env.DATA_DIR ?? "data/raw");
  const pool = getPool();
  await runMigrations(pool);
  await runSeeds(pool);

  const stats: LoadStats[] = [];
  for (const region of regions) {
    console.log(`loading ${region} …`);
    stats.push(await loadRegion(pool, dataDir, region, { limit }));
  }
  printSummary(stats);

  if (!skipAnalytics) await runAnalytics(pool);

  await pool.end();
}

if (isMain(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
