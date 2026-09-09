import type pg from "pg";
import { notFound } from "../errors";

const VALID_STATUSES = new Set(["new", "routed", "in_progress", "done", "cancelled"]);

export async function recordMutation(
  pool: pg.Pool,
  appealId: string,
  kind: "route" | "draft" | "mark_duplicate",
  payload: Record<string, unknown>,
): Promise<{ id: number }> {
  const check = await pool.query<{ id: string }>("SELECT id FROM appeals WHERE id = $1", [
    appealId,
  ]);
  if (check.rows.length === 0) {
    throw notFound(`Appeal ${appealId} not found`);
  }

  if (kind === "route" && typeof payload.status === "string" && VALID_STATUSES.has(payload.status)) {
    await pool.query("UPDATE appeals SET status = $1 WHERE id = $2", [
      payload.status,
      appealId,
    ]);
  }

  const res = await pool.query<{ id: number }>(
    `INSERT INTO mutations (appeal_id, kind, payload)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [appealId, kind, JSON.stringify(payload)],
  );

  return { id: res.rows[0]!.id };
}
