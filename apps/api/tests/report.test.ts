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

test("POST /api/report with xlsx format returns valid excel file", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/report",
    payload: { view: "regions", format: "xlsx" },
  });
  expect(res.statusCode).toBe(200);
  expect(res.headers["content-type"]).toContain("spreadsheetml");
  expect(res.rawPayload.length).toBeGreaterThan(1000);
  // Zip header: PK (0x50, 0x4B)
  expect(res.rawPayload[0]).toBe(0x50);
  expect(res.rawPayload[1]).toBe(0x4b);
});

test("POST /api/report with pdf format returns valid pdf file", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/report",
    payload: { view: "overview", format: "pdf" },
  });
  expect(res.statusCode).toBe(200);
  expect(res.headers["content-type"]).toBe("application/pdf");
  // PDF header: %PDF
  const header = res.rawPayload.subarray(0, 4).toString("utf8");
  expect(header).toBe("%PDF");
});

test("POST /api/report with invalid format returns 400", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/report",
    payload: { view: "regions", format: "csv" },
  });
  expect(res.statusCode).toBe(400);
  expect(res.json().error.code).toBe("bad_request");
});
