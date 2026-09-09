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

test("GET /api/spikes -> 200 array (may be empty on small fixture)", async () => {
  const res = await app.inject({ url: "/api/spikes" });
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.json())).toBe(true);
});

test("GET /api/forecast?region=akmola&theme=water -> {history, forecast}", async () => {
  const res = await app.inject({ url: "/api/forecast?region=akmola&theme=water" });
  expect(res.statusCode).toBe(200);
  const b = res.json();
  expect(Array.isArray(b.history)).toBe(true);
  expect(Array.isArray(b.forecast)).toBe(true);
  expect(typeof b.method).toBe("string");
});

test("GET /api/forecast without params -> 400", async () => {
  const res = await app.inject({ url: "/api/forecast?region=akmola" });
  expect(res.statusCode).toBe(400);
});
