import type pg from "pg";
import type { ModelEval, ModelEvalTheme, ThemeCode } from "@zerde/types";

export async function getModelEval(pool: pg.Pool): Promise<ModelEval | null> {
  const overviewRes = await pool.query<{
    method: string;
    computed_at: Date;
    n_holdout: number;
    accuracy: number;
    macro_f1: number;
  }>("SELECT method, computed_at, n_holdout, accuracy, macro_f1 FROM model_eval_overview LIMIT 1");

  const overview = overviewRes.rows[0];
  if (!overview) return null;

  const themesRes = await pool.query<{
    theme: string;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>("SELECT theme, precision, recall, f1, support FROM model_eval_themes ORDER BY theme");

  const confusionRes = await pool.query<{
    actual: string;
    predicted: string;
    n: number;
  }>("SELECT actual, predicted, n FROM model_eval_confusion ORDER BY actual, predicted");

  const perTheme: ModelEvalTheme[] = themesRes.rows.map((t) => ({
    theme: t.theme as ThemeCode,
    precision: Number(t.precision),
    recall: Number(t.recall),
    f1: Number(t.f1),
    support: Number(t.support),
  }));

  const confusion = confusionRes.rows.map((c) => ({
    actual: c.actual as ThemeCode,
    predicted: c.predicted as ThemeCode,
    n: Number(c.n),
  }));

  return {
    method: overview.method,
    computedAt: overview.computed_at.toISOString(),
    nHoldout: Number(overview.n_holdout),
    accuracy: Number(overview.accuracy),
    macroF1: Number(overview.macro_f1),
    perTheme,
    confusion,
  };
}
