import { expect, test } from "vitest";
import { parseArgs } from "../src/index";

test("parseArgs: --all expands to all region codes", () => {
  const r = parseArgs(["--all"]);
  expect(r.regions).toContain("akmola");
  expect(r.regions).toHaveLength(7);
  expect(r.skipAnalytics).toBe(false);
});

test("parseArgs: repeated --region collects, --limit parses, --skip-analytics", () => {
  const r = parseArgs(["--region=akmola", "--region=pavlodar", "--limit=500", "--skip-analytics"]);
  expect(r.regions).toEqual(["akmola", "pavlodar"]);
  expect(r.limit).toBe(500);
  expect(r.skipAnalytics).toBe(true);
});

test("parseArgs: unknown region throws", () => {
  expect(() => parseArgs(["--region=narnia"])).toThrow(/unknown region/i);
});

test("parseArgs: no region args throws", () => {
  expect(() => parseArgs([])).toThrow(/--all or --region/i);
});
