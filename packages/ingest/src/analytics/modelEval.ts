import type pg from "pg";
import { THEME_CODES, type ThemeCode } from "@zerde/types";
import { classifyText } from "../classifyText";
import { THEME_RULES } from "../themeRules";
import { THEME_SERVICE } from "../taxonomy";

export interface ModelEvalStats {
  nHoldout: number;
  accuracy: number;
  macroF1: number;
}

export async function computeModelEval(pool: pg.Pool): Promise<ModelEvalStats> {
  const ctx = { rules: THEME_RULES, themeService: THEME_SERVICE };

  // Holdout ~20%
  let res = await pool.query<{ id: string; theme: string; text: string }>(
    `SELECT id, theme, coalesce(raw_category, '') || ' ' || coalesce(subcategory, '') AS text
       FROM appeals
      WHERE raw_category IS NOT NULL AND abs(hashtext(id)) % 5 = 0`,
  );

  // If hash-based holdout is empty on small test dataset, take all rows with raw_category
  if (res.rows.length === 0) {
    res = await pool.query<{ id: string; theme: string; text: string }>(
      `SELECT id, theme, coalesce(raw_category, '') || ' ' || coalesce(subcategory, '') AS text
         FROM appeals
        WHERE raw_category IS NOT NULL`,
    );
  }

  const rows = res.rows;
  const nHoldout = rows.length;

  if (nHoldout === 0) {
    return { nHoldout: 0, accuracy: 0, macroF1: 0 };
  }

  const confusion: Record<string, Record<string, number>> = {};
  let totalCorrect = 0;

  for (const row of rows) {
    const actual = row.theme;
    const predicted = classifyText(row.text, ctx).theme;

    if (!confusion[actual]) confusion[actual] = {};
    confusion[actual]![predicted] = (confusion[actual]![predicted] ?? 0) + 1;

    if (actual === predicted) {
      totalCorrect++;
    }
  }

  const accuracy = totalCorrect / nHoldout;

  const perThemeStats: Array<{
    theme: ThemeCode;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }> = [];

  let f1Sum = 0;
  let evaluatedThemesCount = 0;

  for (const theme of THEME_CODES) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let support = 0;

    for (const actual of THEME_CODES) {
      const actRow = confusion[actual] ?? {};
      for (const pred of THEME_CODES) {
        const count = actRow[pred] ?? 0;
        if (actual === theme && pred === theme) tp += count;
        if (actual !== theme && pred === theme) fp += count;
        if (actual === theme && pred !== theme) fn += count;
        if (actual === theme) support += count;
      }
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = support > 0 ? tp / support : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perThemeStats.push({
      theme,
      precision,
      recall,
      f1,
      support,
    });

    if (support > 0) {
      f1Sum += f1;
      evaluatedThemesCount++;
    }
  }

  const macroF1 = evaluatedThemesCount > 0 ? f1Sum / evaluatedThemesCount : 0;

  // Persist to DB
  await pool.query("TRUNCATE model_eval_overview, model_eval_themes, model_eval_confusion");

  const method = "keyword-baseline (proxy text = raw_category+subcategory)";
  await pool.query(
    `INSERT INTO model_eval_overview (method, n_holdout, accuracy, macro_f1)
     VALUES ($1, $2, $3, $4)`,
    [method, nHoldout, accuracy, macroF1],
  );

  for (const t of perThemeStats) {
    await pool.query(
      `INSERT INTO model_eval_themes (theme, precision, recall, f1, support)
       VALUES ($1, $2, $3, $4, $5)`,
      [t.theme, t.precision, t.recall, t.f1, t.support],
    );
  }

  for (const actual of Object.keys(confusion)) {
    const actRow = confusion[actual]!;
    for (const predicted of Object.keys(actRow)) {
      const count = actRow[predicted]!;
      if (count > 0) {
        await pool.query(
          `INSERT INTO model_eval_confusion (actual, predicted, n)
           VALUES ($1, $2, $3)`,
          [actual, predicted, count],
        );
      }
    }
  }

  return { nHoldout, accuracy, macroF1 };
}
