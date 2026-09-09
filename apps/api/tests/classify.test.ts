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

test("POST /api/classify returns classified result", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/classify",
    payload: { text: "нет отопления, батареи холодные" },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.theme).toBe("heating");
  expect(body.confidence).toBeGreaterThan(0.5);
  expect(body.service).toBeDefined();
});

test("POST /api/classify with empty text returns 400", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/classify",
    payload: { text: "" },
  });
  expect(res.statusCode).toBe(400);
  expect(res.json().error.code).toBe("bad_request");
});
