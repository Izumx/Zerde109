import { expect, test } from "vitest";
import { eastKazakhstanMapper } from "../../src/mappers/eastKazakhstan";
import { loadFixture, row, testClassify } from "../_fixtures";

const rows = loadFixture("eastKazakhstan.sample.csv");

test("row 0: info, consultation, PII dropped", () => {
  const r = eastKazakhstanMapper.map(row(rows, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.region).toBe("east-kazakhstan");
  expect(r.appeal.theme).toBe("info");
  expect(r.appeal.appealType).toBe("consultation");
  expect(r.appeal.locality).toBe("Усть-Каменогорск");
  const json = JSON.stringify(r.appeal);
  expect(json).not.toContain("Иванов");
  expect(json).not.toContain("77011112233");
});

test("row 1: electricity, incident, whatsapp, district, operator, address", () => {
  const r = eastKazakhstanMapper.map(row(rows, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("electricity");
  expect(r.appeal.appealType).toBe("incident");
  expect(r.appeal.channel).toBe("whatsapp");
  expect(r.appeal.district).toBe("Глубоковский район");
  expect(r.appeal.locality).toBeNull();
  expect(r.appeal.operator).toBe("op42");
  expect(r.appeal.address).toBe("улица Мира 4");
  expect(r.appeal.resolution).toBe("Проблема устранена");
});

test("row 2: roads, complaint", () => {
  const r = eastKazakhstanMapper.map(row(rows, 2), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("roads");
  expect(r.appeal.appealType).toBe("complaint");
});
