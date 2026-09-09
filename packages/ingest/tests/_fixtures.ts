import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { classifyWith, type ThemeClassifier } from "../src/themeMap";
import { THEME_RULES } from "../src/themeRules";

/** Классификатор тем на авторских правилах — для юнит-тестов мапперов. */
export const testClassify: ThemeClassifier = (inputs) => classifyWith(THEME_RULES, inputs);

/** Читает фикстуру `packages/ingest/fixtures/<name>` в массив объектов-строк. */
export function loadFixture(name: string): Record<string, string>[] {
  const csv = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, string>[];
}

/** Строка фикстуры по индексу, с проверкой наличия. */
export function row(rows: Record<string, string>[], i: number): Record<string, string> {
  const r = rows[i];
  if (!r) throw new Error(`fixture row ${i} is missing (have ${rows.length})`);
  return r;
}
