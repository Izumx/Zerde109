import { expect, test } from "vitest";
import { kostanayMapper } from "../../src/mappers/kostanay";
import { turkestanMapper } from "../../src/mappers/turkestan";
import { REGION_CODES, REGION_MAPPERS } from "../../src/mappers/index";
import { loadFixture, row, testClassify } from "../_fixtures";

const kos = loadFixture("kostanay.sample.csv");
const tur = loadFixture("turkestan.sample.csv");

test("kostanay row 0: sewer, incident, done, slabreach->overdue, sla/deadline, resolution", () => {
  const r = kostanayMapper.map(row(kos, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.region).toBe("kostanay");
  expect(r.appeal.sourceId).toBe("504616");
  expect(r.appeal.theme).toBe("sewer");
  expect(r.appeal.appealType).toBe("incident");
  expect(r.appeal.status).toBe("done");
  expect(r.appeal.isOverdue).toBe(true);
  expect(r.appeal.slaDays).toBe(1);
  expect(r.appeal.deadlineAt?.toISOString()).toBe("2025-03-15T13:58:41.274Z");
  expect(r.appeal.channel).toBe("ekc109");
  expect(r.appeal.locality).toBe("КОСТАНАЙ");
  expect(r.appeal.lat).toBeNull();
  expect(r.appeal.resolution).toBe("выполнили.");
});

test("kostanay row 1: lighting, cancelled (закрыто инициатором), whatsapp, sl3 placeholder ignored", () => {
  const r = kostanayMapper.map(row(kos, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("lighting");
  expect(r.appeal.status).toBe("cancelled");
  expect(r.appeal.channel).toBe("whatsapp");
  expect(r.appeal.subcategory).toBe("ОТСУТСТВИЕ ОСВЕЩЕНИЯ");
});

test("turkestan row 0: electricity, incident, done, no resolution column", () => {
  const r = turkestanMapper.map(row(tur, 0), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.region).toBe("turkestan");
  expect(r.appeal.theme).toBe("electricity");
  expect(r.appeal.resolution).toBeNull();
  expect(r.appeal.locality).toBe("ТУРКЕСТАН");
});

test("turkestan row 1: improvement, complaint (жалоба), district САЙРАМСКИЙ", () => {
  const r = turkestanMapper.map(row(tur, 1), testClassify);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.appeal.theme).toBe("improvement");
  expect(r.appeal.appealType).toBe("complaint");
  expect(r.appeal.district).toBe("САЙРАМСКИЙ");
  expect(r.appeal.locality).toBeNull();
});

test("registry has all 7 regions, each mapper.region matches its key", () => {
  expect([...REGION_CODES].sort()).toEqual([
    "akmola", "almaty", "east-kazakhstan", "karaganda", "kostanay", "pavlodar", "turkestan",
  ]);
  for (const [code, cfg] of Object.entries(REGION_MAPPERS)) {
    expect(cfg.mapper.region).toBe(code);
    expect(cfg.files.length).toBeGreaterThan(0);
  }
});
