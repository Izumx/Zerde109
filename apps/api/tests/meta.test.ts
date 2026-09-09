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

test("GET /api/meta returns 20 regions (7 active), 17 themes, 16 services, channels, statuses", async () => {
  const res = await app.inject({ method: "GET", url: "/api/meta" });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.regions).toHaveLength(20);
  expect(body.regions.filter((r: { isActive: boolean }) => r.isActive)).toHaveLength(7);
  expect(body.themes).toHaveLength(17);
  expect(body.services).toHaveLength(16);
  expect(body.channels.length).toBeGreaterThanOrEqual(9);
  expect(body.statuses.map((s: { code: string }) => s.code)).toContain("in_progress");
});
