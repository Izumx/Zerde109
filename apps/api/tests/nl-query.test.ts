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

test("Intent 1: count_by_theme_region_period", async () => {
  const query = "Сколько обращений по воде в Акмолинской области за месяц";
  const res = await app.inject({
    method: "POST",
    url: "/api/nl-query",
    payload: { q: query },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.intent).toBe("count_by_theme_region_period");
  expect(typeof body.value).toBe("number");
  expect(body.sql).not.toContain(query);
});

test("Intent 2: top_themes", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/nl-query",
    payload: { q: "Топ 5 тем в Алматы за 30 дней" },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.intent).toBe("top_themes");
  expect(Array.isArray(body.rows)).toBe(true);
  expect(body.chart?.type).toBe("bar");
});

test("Intent 3: theme_dynamics", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/nl-query",
    payload: { q: "Динамика обращений по дорогам за месяц" },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.intent).toBe("theme_dynamics");
  expect(Array.isArray(body.rows)).toBe(true);
  expect(body.chart?.type).toBe("line");
});

test("Intent 4: overdue_share_by_region", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/nl-query",
    payload: { q: "Доля просрочек по регионам за месяц" },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.intent).toBe("overdue_share_by_region");
  expect(Array.isArray(body.rows)).toBe(true);
  expect(body.chart?.type).toBe("bar");
});

test("Intent 5: compare_regions", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/nl-query",
    payload: { q: "Сравнить Акмолу и Алматы по воде за месяц" },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.intent).toBe("compare_regions");
  expect(Array.isArray(body.rows)).toBe(true);
});

test("Unrecognized query -> 422 code: unrecognized_query", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/nl-query",
    payload: { q: "свари борщ" },
  });
  expect(res.statusCode).toBe(422);
  expect(res.json().error.code).toBe("unrecognized_query");
});
