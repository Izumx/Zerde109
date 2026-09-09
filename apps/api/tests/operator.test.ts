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

test("similar for akmola:t1 -> array with similarity in 0..1, id != target", async () => {
  const res = await app.inject({ url: "/api/appeals/akmola:t1/similar" });
  expect(res.statusCode).toBe(200);
  const items = res.json() as { id: string; similarity: number }[];
  expect(Array.isArray(items)).toBe(true);
  for (const it of items) {
    expect(it.id).not.toBe("akmola:t1");
    expect(it.similarity).toBeGreaterThanOrEqual(0);
    expect(it.similarity).toBeLessThanOrEqual(1);
  }
});

test("duplicates for repeated address -> repeats is not empty", async () => {
  // Find appeal with address "ул. Повторная 1"
  const row = await pool.query<{ id: string }>(
    "SELECT id FROM appeals WHERE address = 'ул. Повторная 1' ORDER BY created_at DESC LIMIT 1",
  );
  expect(row.rows.length).toBe(1);
  const targetId = row.rows[0]!.id;

  const res = await app.inject({ url: `/api/appeals/${targetId}/duplicates` });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(Array.isArray(body.nearDuplicates)).toBe(true);
  expect(Array.isArray(body.repeats)).toBe(true);
  expect(body.repeats.length).toBeGreaterThan(0);
});

test("templates?theme=water -> at least 1 template", async () => {
  const res = await app.inject({ url: "/api/templates?theme=water" });
  expect(res.statusCode).toBe(200);
  const templates = res.json();
  expect(Array.isArray(templates)).toBe(true);
  expect(templates.length).toBeGreaterThanOrEqual(1);
  expect(templates[0].themeCode).toBe("water");
});

test("POST /api/appeals/:id/route updates status and records mutation, 404 on missing", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/appeals/akmola:t1/route",
    payload: { kind: "route", payload: { status: "in_progress" } },
  });
  expect(res.statusCode).toBe(200);
  expect(typeof res.json().id).toBe("number");

  const appealRes = await app.inject({ url: "/api/appeals/akmola:t1" });
  expect(appealRes.statusCode).toBe(200);
  expect(appealRes.json().status).toBe("in_progress");

  const mutRes = await pool.query<{ count: string }>(
    "SELECT count(*) FROM mutations WHERE appeal_id = 'akmola:t1'",
  );
  expect(Number(mutRes.rows[0]!.count)).toBeGreaterThan(0);

  const missingRes = await app.inject({
    method: "POST",
    url: "/api/appeals/nope:0/route",
    payload: { kind: "route", payload: { status: "in_progress" } },
  });
  expect(missingRes.statusCode).toBe(404);
  expect(missingRes.json().error.code).toBe("not_found");
});
