import type { ThemeCode } from "@zerde/types";

/** Тема → код службы по умолчанию (зеркало packages/ingest THEME_SERVICE). */
export const THEME_SERVICE: Record<ThemeCode, string> = {
  water: "vodokanal",
  electricity: "elektroseti",
  heating: "teploseti",
  gas: "gorgaz",
  sewer: "vodokanal",
  roads: "dorozhnaya",
  lighting: "gorsvet",
  improvement: "blagoustroystvo",
  waste: "spetsavto",
  transport: "passtransport",
  health: "zdrav",
  animals: "vetsluzhba",
  housing: "zhkh",
  info: "spravka109",
  quarantine: "sanepid",
  emergency: "chs",
  other: "akimat",
};
