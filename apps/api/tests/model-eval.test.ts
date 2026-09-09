import { afterAll, beforeAll, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { computeModelEval } from "@zerde/ingest/analytics/modelEval";
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

test("GET /api/model-eval -> 404 if not computed, 200 after computation", async () => {
  // Before computation
  const resBefore = await app.inject({ url: "/api/model-eval" });
  expect(resBefore.statusCode).toBe(404);
  expect(resBefore.json().error.code).toBe("not_found");

  // Compute
  await computeModelEval(pool);

  // After computation
  const resAfter = await app.inject({ url: "/api/model-eval" });
  expect(resAfter.statusCode).toBe(200);
  const data = resAfter.json();
  expect(typeof data.accuracy).toBe("number");
  expect(data.accuracy).toBeGreaterThanOrEqual(0);
  expect(data.accuracy).toBeLessThanOrEqual(1);
  expect(Array.isArray(data.perTheme)).toBe(true);
  expect(Array.isArray(data.confusion)).toBe(true);
});
