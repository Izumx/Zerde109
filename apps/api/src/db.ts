import pg from "pg";
import { readEnv } from "./env";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) pool = new pg.Pool({ connectionString: readEnv().databaseUrl, max: 12 });
  return pool;
}

export async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
  pool: pg.Pool,
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query<T>(sql, params as unknown[] | undefined);
  return res.rows;
}
