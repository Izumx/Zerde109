import { expect, test } from "vitest";
import { akmolaMapper } from "../../src/mappers/akmola";
import { loadFixture, row, testClassify } from "../_fixtures";

const rows = loadFixture("akmola.sample.csv");

test("row 0: sewer, routed, channel ekc109, overdue (open past deadline)", () => {
  const r = akmolaMapper.map(row(rows, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.sourceId).toBe("051125-000-037");
  expect(r.appeal.region).toBe("akmola");
  expect(r.appeal.theme).toBe("sewer");
  expect(r.appeal.status).toBe("routed");
  expect(r.appeal.rawStatus).toBe("Передано в службу");
  expect(r.appeal.channel).toBe("ekc109");
  expect(r.appeal.locality).toBe("г. Кокшетау");
  expect(r.appeal.district).toBeNull();
  expect(r.appeal.isOverdue).toBe(true);
  expect(r.appeal.createdAt.toISOString()).toBe("2025-11-05T07:34:46.138Z");
});

test("row 1: health, in_progress, district set", () => {
  const r = akmolaMapper.map(row(rows, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("health");
  expect(r.appeal.status).toBe("in_progress");
  expect(r.appeal.district).toBe("район Целиноградский");
  expect(r.appeal.locality).toBeNull();
});

test("row 2: transport, done", () => {
  const r = akmolaMapper.map(row(rows, 2), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("transport");
  expect(r.appeal.status).toBe("done");
});

test("row 3: column-shifted row rejected", () => {
  const r = akmolaMapper.map(row(rows, 3), testClassify);
  expect(r.ok).toBe(false);
});
