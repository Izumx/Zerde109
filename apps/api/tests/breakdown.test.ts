import { afterAll, beforeAll, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { makeTestServer } from "./_server";

let app: FastifyInstance;
let pool: pg.Pool;
beforeAll(async () => {
  ({ app, pool } = await makeTestServer());
});
afterAll(async () => {
  await app.close();
  await pool.end();
});

test("GET /api/breakdown?dim=theme — rows sum to total, labels present", async () => {
  const total = (await app.inject({ url: "/api/kpi?from=2024-01-01&to=2025-12-31" })).json().total;
  const res = await app.inject({ url: "/api/breakdown?dim=theme&from=2024-01-01&to=2025-12-31" });
  expect(res.statusCode).toBe(200);
  const rows = res.json() as { key: string; label: string; count: number }[];
  expect(rows.reduce((s, r) => s + r.count, 0)).toBe(total);
  expect(rows.every((r) => r.label.length > 0)).toBe(true);
});

test("GET /api/breakdown?dim=hacky -> 400", async () => {
  const res = await app.inject({ url: "/api/breakdown?dim=hacky" });
  expect(res.statusCode).toBe(400);
});
