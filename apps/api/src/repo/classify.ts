import type { ClassifyResult, Language } from "@zerde/types";
import { classifyText, THEME_RULES, THEME_SERVICE } from "@zerde/ingest";

export function classify(text: string, language?: Language): ClassifyResult {
  return classifyText(
    text,
    { rules: THEME_RULES, themeService: THEME_SERVICE },
    { language },
  );
}
