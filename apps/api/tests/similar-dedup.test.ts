import { afterAll, beforeAll, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import type pg from "pg";
import { makeTestServer } from "./_server";

let app: FastifyInstance;
let pool: pg.Pool;

beforeAll(async () => {
  ({ app, pool } = await makeTestServer());

  // Три буквально одинаковых обращения + один целевой в том же регионе/теме.
  const cols =
    "id, source_id, region, theme, status, priority, language, created_at, search_text, raw_category, subcategory";
  const mk = (i: number) =>
    `('dedup-${i}','d${i}','akmola','water','done','low','ru', now() - interval '${i} days', 'лифт застрял человек', 'ЖКХ', 'Лифт')`;
  await pool.query(
    `INSERT INTO appeals (${cols}) VALUES
       ('dedup-target','dt','akmola','water','routed','high','ru', now(), 'лифт застрял человек сейчас', 'ЖКХ', 'Лифт'),
       ${mk(1)}, ${mk(2)}, ${mk(3)}, ${mk(4)}, ${mk(5)}`,
  );
});
afterAll(async () => {
  await pool.query("DELETE FROM appeals WHERE id LIKE 'dedup-%'");
  await app.close();
  await pool.end();
});

test("GET /similar collapses byte-identical duplicates to one case", async () => {
  const res = await app.inject({ url: "/api/appeals/dedup-target/similar" });
  expect(res.statusCode).toBe(200);
  const items = res.json() as { id: string; preview: string }[];

  // 5 одинаковых 'dedup-N' → ровно одна карточка среди похожих
  const dupHits = items.filter((x) => x.id.startsWith("dedup-"));
  expect(dupHits).toHaveLength(1);
});
