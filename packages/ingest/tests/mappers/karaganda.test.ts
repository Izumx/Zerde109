import { expect, test } from "vitest";
import { karagandaMapper } from "../../src/mappers/karaganda";
import { loadFixture, row, testClassify } from "../_fixtures";

const rows = loadFixture("karaganda.sample.csv");

test("row 0: quarantine, incident, done, locality+address, deterministic synthetic id", () => {
  const r = karagandaMapper.map(row(rows, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.region).toBe("karaganda");
  expect(r.appeal.theme).toBe("quarantine");
  expect(r.appeal.appealType).toBe("incident");
  expect(r.appeal.status).toBe("done");
  expect(r.appeal.locality).toBe("город Караганда");
  expect(r.appeal.district).toBe("Район имени Казыбек би");
  expect(r.appeal.address).toBe("Казахстан, Караганда, улица Гоголя, 95");
  expect(r.appeal.channel).toBe("ekc109");
  expect(r.appeal.sourceId).toMatch(/^[0-9a-f]{24}$/);

  const again = karagandaMapper.map(row(rows, 0), testClassify);
  expect(again.ok && again.appeal.sourceId).toBe(r.appeal.sourceId);
});

test("row 1: lighting, consultation, social channel", () => {
  const r = karagandaMapper.map(row(rows, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("lighting");
  expect(r.appeal.appealType).toBe("consultation");
  expect(r.appeal.channel).toBe("social");
});

test("row 2: water, appeal, web channel, serviceOrg set", () => {
  const r = karagandaMapper.map(row(rows, 2), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("water");
  expect(r.appeal.appealType).toBe("appeal");
  expect(r.appeal.channel).toBe("web");
  expect(r.appeal.serviceOrg).toBe("ТОО «Балхаш Су»");
});
