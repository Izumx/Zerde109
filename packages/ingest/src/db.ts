import pg from "pg";

let pool: pg.Pool | null = null;

/** Синглтон-пул из `process.env.DATABASE_URL`. */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new pg.Pool({ connectionString, max: 8 });
  }
  return pool;
}

/** Выполнить `fn` с общим пулом и гарантированно закрыть его в конце. */
export async function withPool<T>(fn: (p: pg.Pool) => Promise<T>): Promise<T> {
  const p = getPool();
  try {
    return await fn(p);
  } finally {
    await p.end();
    pool = null;
  }
}

/** Тонкая обёртка над `pool.query`, возвращает только `rows`. */
export async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
  pool: pg.Pool,
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as unknown[] | undefined);
  return res.rows;
}
