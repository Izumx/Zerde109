import { expect, test } from "vitest";
import { classifyText } from "../src/classifyText";
import { THEME_RULES } from "../src/themeRules";
import { THEME_SERVICE } from "../src/taxonomy";

const ctx = { rules: THEME_RULES, themeService: THEME_SERVICE };

test("Көшеде жарық жоқ, үшінші күн -> theme: lighting, language: kk, confidence > 0.5", () => {
  const res = classifyText("Көшеде жарық жоқ, үшінші күн", ctx);
  expect(res.theme).toBe("lighting");
  expect(res.language).toBe("kk");
  expect(res.confidence).toBeGreaterThan(0.5);
});

test("Прорыв трубы, нет воды в доме по ул. Абая 12 -> theme: water, priority: high, entities.address contains Абая", () => {
  const res = classifyText("Прорыв трубы, нет воды в доме по ул. Абая 12", ctx);
  expect(res.theme).toBe("water");
  expect(res.priority).toBe("high");
  expect(res.entities.address).toContain("Абая");
});

test("Не работает светофор на перекрёстке -> theme: roads, entities.object: светофор", () => {
  const res = classifyText("Не работает светофор на перекрёстке", ctx);
  expect(res.theme).toBe("roads");
  expect(res.entities.object).toBe("светофор");
});

test("к136 zzz непонятно -> theme: other, confidence ≈ 0.3", () => {
  const res = classifyText("к136 zzz непонятно", ctx);
  expect(res.theme).toBe("other");
  expect(res.confidence).toBeCloseTo(0.3, 1);
});
