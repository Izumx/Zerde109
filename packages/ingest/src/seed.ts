import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type pg from "pg";
import "./loadEnv";
import { getPool } from "./db";
import { runMigrations } from "./migrate";
import { SEEDS_DIR, isMain } from "./paths";

/**
 * Выполняет `db/seeds/*.sql` в алфавитном порядке. Идемпотентно —
 * все сид-файлы используют `ON CONFLICT ... DO UPDATE` / `DELETE`+`INSERT`.
 */
export async function runSeeds(pool: pg.Pool, dir: string = SEEDS_DIR): Promise<void> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(join(dir, file), "utf8");
    await pool.query(sql);
  }
}

if (isMain(import.meta.url)) {
  const pool = getPool();
  runMigrations(pool)
    .then(() => runSeeds(pool))
    .then(() => {
      console.log("seeds applied");
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
