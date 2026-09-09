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

test("list: default page, total matches fixture count", async () => {
  const dbTotal = Number((await pool.query("SELECT count(*) c FROM appeals")).rows[0].c);
  const res = await app.inject({ url: "/api/appeals" });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.total).toBe(dbTotal);
  expect(body.items.length).toBeLessThanOrEqual(50);
  expect(body.items[0]).toHaveProperty("preview");
});

test("filters: region + status", async () => {
  const res = await app.inject({ url: "/api/appeals?region=akmola&status=done" });
  const body = res.json();
  expect(body.items.every((i: { region: string; status: string }) => i.region === "akmola" && i.status === "done")).toBe(true);
});

test("search finds the repeat-address rows", async () => {
  const res = await app.inject({ url: "/api/appeals?search=" + encodeURIComponent("Повторная") });
  expect(res.json().total).toBeGreaterThan(0);
});

test("pagination slices", async () => {
  const p1 = (await app.inject({ url: "/api/appeals?page=1&pageSize=5" })).json();
  const p2 = (await app.inject({ url: "/api/appeals?page=2&pageSize=5" })).json();
  expect(p1.items).toHaveLength(5);
  expect(p1.items[0].id).not.toBe(p2.items[0]?.id);
});

test("GET /api/appeals/:id and 404", async () => {
  const ok = await app.inject({ url: "/api/appeals/akmola:t1" });
  expect(ok.statusCode).toBe(200);
  expect(ok.json().id).toBe("akmola:t1");
  const no = await app.inject({ url: "/api/appeals/nope:0" });
  expect(no.statusCode).toBe(404);
  expect(no.json().error.code).toBe("not_found");
});
