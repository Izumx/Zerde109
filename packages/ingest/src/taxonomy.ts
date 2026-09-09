import type { ThemeCode } from "@zerde/types";

/** Тема → код ответственной службы (`services.code`). */
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

export const STATUS_SET = new Set(["new", "routed", "in_progress", "done", "cancelled"]);
export const CHANNEL_SET = new Set([
  "ekc109", "whatsapp", "instagram", "telegram", "facebook",
  "mobile", "web", "social", "monitoring", "other",
]);
export const APPEAL_TYPE_SET = new Set([
  "consultation", "incident", "complaint", "appeal", "gratitude", "suggestion", "other",
]);
