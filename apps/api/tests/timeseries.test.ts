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

test("GET /api/timeseries?granularity=month returns valid points", async () => {
  const res = await app.inject({ method: "GET", url: "/api/timeseries?granularity=month" });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.granularity).toBe("month");
  expect(Array.isArray(body.points)).toBe(true);
  expect(body.points.length).toBeGreaterThan(0);

  let sum = 0;
  for (const pt of body.points) {
    expect(typeof pt.bucket).toBe("string");
    expect(typeof pt.count).toBe("number");
    expect(typeof pt.overdue).toBe("number");
    sum += pt.count;
  }

  const cnt = await pool.query<{ n: string }>("SELECT count(*) n FROM appeals");
  expect(sum).toBe(Number(cnt.rows[0]!.n));
});

test("GET /api/timeseries with invalid granularity returns 400", async () => {
  const res = await app.inject({ method: "GET", url: "/api/timeseries?granularity=year" });
  expect(res.statusCode).toBe(400);
  expect(res.json().error.code).toBe("bad_request");
});
