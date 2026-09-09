import "./loadEnv";
import { getPool } from "./db";
import { runMigrations } from "./migrate";
import { computeModelEval } from "./analytics/modelEval";
import { isMain } from "./paths";

export async function runEval(): Promise<void> {
  const pool = getPool();
  console.log("Applying migrations...");
  await runMigrations(pool);
  console.log("Computing model evaluation backtest...");
  const stats = await computeModelEval(pool);
  console.log(`Holdout samples: ${stats.nHoldout}`);
  console.log(`Overall accuracy: ${(stats.accuracy * 100).toFixed(2)}%`);
  console.log(`Macro F1: ${(stats.macroF1 * 100).toFixed(2)}%`);
  await pool.end();
}

if (isMain(import.meta.url)) {
  runEval().catch((err) => {
    console.error("Eval failed:", err);
    process.exit(1);
  });
}
