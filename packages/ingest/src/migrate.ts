import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type pg from "pg";
import "./loadEnv";
import { getPool, q } from "./db";
import { MIGRATIONS_DIR, isMain } from "./paths";

/**
 * Применяет невыполненные `db/migrations/*.sql` в лексикографическом порядке,
 * каждую в отдельной транзакции, учитывая применённые в `schema_migrations`.
 * Возвращает имена применённых в этом вызове файлов.
 */
export async function runMigrations(pool: pg.Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const applied = new Set(
    (await q<{ name: string }>(pool, "SELECT name FROM schema_migrations")).map((r) => r.name),
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      ran.push(file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  return ran;
}

if (isMain(import.meta.url)) {
  const pool = getPool();
  runMigrations(pool)
    .then((ran) => {
      console.log(ran.length ? `applied: ${ran.join(", ")}` : "nothing to migrate");
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
