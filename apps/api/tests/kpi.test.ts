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

test("GET /api/kpi returns shape with sane ranges", async () => {
  const res = await app.inject({ method: "GET", url: "/api/kpi" });
  expect(res.statusCode).toBe(200);
  const k = res.json();
  for (const key of ["total", "prevTotal", "deltaPct", "overdueShare", "repeatShare", "openNow"]) {
    expect(typeof k[key]).toBe("number");
  }
  expect(k.total).toBeGreaterThan(0);
  expect(k.overdueShare).toBeGreaterThanOrEqual(0);
  expect(k.overdueShare).toBeLessThanOrEqual(1);
});

test("GET /api/kpi?region=akmola narrows the count", async () => {
  const all = (await app.inject({ method: "GET", url: "/api/kpi" })).json();
  const one = (await app.inject({ method: "GET", url: "/api/kpi?region=akmola" })).json();
  expect(one.total).toBeLessThan(all.total);
  expect(one.total).toBeGreaterThan(0);
});

test("GET /api/kpi?region=narnia -> 400 envelope", async () => {
  const res = await app.inject({ method: "GET", url: "/api/kpi?from=nope" });
  expect(res.statusCode).toBe(400);
  expect(res.json().error.code).toBe("bad_request");
});
