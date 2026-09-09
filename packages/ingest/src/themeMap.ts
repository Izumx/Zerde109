import type pg from "pg";
import type { ThemeCode } from "@zerde/types";
import type { ThemeRule } from "./themeRules";

export type { ThemeRule } from "./themeRules";
export type ThemeClassifier = (inputs: (string | null | undefined)[]) => ThemeCode;

/**
 * Классифицирует набор строк-категорий в одну тему.
 * Правила сортируются по возрастанию `priority`; первое совпадение подстроки
 * (регистронезависимо) выигрывает. Пустой вход → `"other"`.
 */
export function classifyWith(
  rules: ThemeRule[],
  inputs: (string | null | undefined)[],
): ThemeCode {
  const haystack = inputs.filter(Boolean).join(" | ").toLowerCase();
  if (!haystack.trim()) return "other";
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (haystack.includes(rule.pattern.toLowerCase())) return rule.themeCode;
  }
  return "other";
}

/** Загружает правила из `theme_map` и возвращает готовый классификатор. */
export async function loadThemeMap(pool: pg.Pool): Promise<ThemeClassifier> {
  const { rows } = await pool.query<{ pattern: string; theme_code: ThemeCode; priority: number }>(
    "SELECT pattern, theme_code, priority FROM theme_map",
  );
  const rules: ThemeRule[] = rows
    .map((r) => ({ pattern: r.pattern, themeCode: r.theme_code, priority: r.priority }))
    .sort((a, b) => a.priority - b.priority);
  return (inputs) => classifyWith(rules, inputs);
}
