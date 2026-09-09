import { expect, test } from "vitest";
import { almatyMapper } from "../../src/mappers/almaty";
import { loadFixture, row, testClassify } from "../_fixtures";

const rows = loadFixture("almaty.sample.csv");

test("row 0: electricity, done, ekc109, consultation", () => {
  const r = almatyMapper.map(row(rows, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.region).toBe("almaty");
  expect(r.appeal.theme).toBe("electricity");
  expect(r.appeal.status).toBe("done");
  expect(r.appeal.channel).toBe("ekc109");
  expect(r.appeal.appealType).toBe("consultation");
  expect(r.appeal.createdAt.toISOString()).toBe("2024-12-31T19:50:35.000Z");
});

test("row 1: water, in_progress, whatsapp, incident, resolution set", () => {
  const r = almatyMapper.map(row(rows, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("water");
  expect(r.appeal.status).toBe("in_progress");
  expect(r.appeal.channel).toBe("whatsapp");
  expect(r.appeal.appealType).toBe("incident");
  expect(r.appeal.language).toBe("ru");
  expect(r.appeal.closedAt?.toISOString()).toBe("2025-01-12T09:35:20.000Z");
  expect(r.appeal.resolution).toBe("Проблема устранена");
});

test("row 2: info, mobile", () => {
  const r = almatyMapper.map(row(rows, 2), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("info");
  expect(r.appeal.channel).toBe("mobile");
});

test("row 3: bad application_number -> rejected", () => {
  const r = almatyMapper.map(row(rows, 3), testClassify);
  expect(r.ok).toBe(false);
});
