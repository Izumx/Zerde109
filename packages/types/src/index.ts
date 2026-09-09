export type ThemeCode =
  | "water" | "electricity" | "heating" | "gas" | "sewer"
  | "roads" | "lighting" | "improvement" | "waste" | "transport"
  | "health" | "animals" | "housing" | "info" | "quarantine"
  | "emergency" | "other";

export const THEME_CODES: readonly ThemeCode[] = [
  "water", "electricity", "heating", "gas", "sewer",
  "roads", "lighting", "improvement", "waste", "transport",
  "health", "animals", "housing", "info", "quarantine",
  "emergency", "other",
] as const;

export type AppealStatus = "new" | "routed" | "in_progress" | "done" | "cancelled";
export type AppealType =
  | "consultation" | "incident" | "complaint" | "appeal"
  | "gratitude" | "suggestion" | "other";
export type Channel =
  | "ekc109" | "whatsapp" | "instagram" | "telegram" | "facebook"
  | "mobile" | "web" | "social" | "monitoring" | "other";
export type Language = "kk" | "ru";
export type Priority = "low" | "medium" | "high";

export interface Appeal {
  id: string;
  sourceId: string;
  region: string;
  district: string | null;
  locality: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  createdAt: string;          // ISO 8601
  closedAt: string | null;
  deadlineAt: string | null;
  theme: ThemeCode;
  rawCategory: string | null;
  subcategory: string | null;
  serviceOrg: string | null;
  status: AppealStatus;
  rawStatus: string | null;
  appealType: AppealType | null;
  channel: Channel | null;
  language: Language;
  priority: Priority;
  isOverdue: boolean;
  slaDays: number | null;
  grade: number | null;
  operator: string | null;
  resolution: string | null;
  searchText: string;
}

export interface RegionRef { code: string; nameRu: string; nameKk: string; isActive: boolean }
export interface ThemeRef { code: ThemeCode; nameRu: string; nameKk: string; color: string; sort: number }
export interface ServiceRef { code: string; nameRu: string; nameKk: string }
