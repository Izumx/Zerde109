import { expect, test } from "vitest";
import { pavlodarMapper } from "../../src/mappers/pavlodar";
import { loadFixture, row, testClassify } from "../_fixtures";

const rows = loadFixture("pavlodar.sample.csv");

test("row 0: quarantine, consultation, done, id from numeric id, no channel", () => {
  const r = pavlodarMapper.map(row(rows, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.region).toBe("pavlodar");
  expect(r.appeal.sourceId).toBe("3434220");
  expect(r.appeal.theme).toBe("quarantine");
  expect(r.appeal.appealType).toBe("consultation");
  expect(r.appeal.status).toBe("done");
  expect(r.appeal.createdAt.toISOString()).toBe("2020-04-13T20:56:05.138Z");
  expect(r.appeal.channel).toBeNull();
});

test("row 1: lighting, incident, in_progress", () => {
  const r = pavlodarMapper.map(row(rows, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("lighting");
  expect(r.appeal.appealType).toBe("incident");
  expect(r.appeal.status).toBe("in_progress");
});

test("row 2: electricity, complaint, routed", () => {
  const r = pavlodarMapper.map(row(rows, 2), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("electricity");
  expect(r.appeal.appealType).toBe("complaint");
  expect(r.appeal.status).toBe("routed");
});
