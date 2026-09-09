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

// --- фильтры ---
export interface RangeFilter { region?: string; theme?: ThemeCode; from?: string; to?: string }
export type Granularity = "day" | "week" | "month";
export type BreakdownDim = "region" | "theme" | "status" | "channel";

// --- ситуационный центр ---
export interface Kpi {
  total: number;
  prevTotal: number;
  deltaPct: number;
  overdueShare: number;      // 0..1
  avgCloseHours: number | null;
  repeatShare: number;       // 0..1
  openNow: number;
}
export interface TimePoint { bucket: string; count: number; overdue: number }
export interface TimeseriesResponse { granularity: Granularity; points: TimePoint[] }
export interface BreakdownRow { key: string; label: string; count: number; overdue: number; deltaPct: number }
export interface SpikeRow {
  region: string; theme: ThemeCode; day: string;
  baseline: number; current: number; ratio: number; zscore: number;
  severity: "low" | "medium" | "high";
}
export interface ForecastRow { month: string; yhat: number; yhatLower: number; yhatUpper: number }
export interface ForecastResponse {
  region: string; theme: ThemeCode; method: string;
  history: { month: string; count: number }[];
  forecast: ForecastRow[];
}
export interface NlQueryResult {
  intent: string;
  sql: string;
  value: number | null;
  rows: Record<string, string | number>[];
  chart: { type: "bar" | "line"; x: string; y: string } | null;
  summary: string;
}

// --- смарт-приём ---
export interface AppealListItem {
  id: string; sourceId: string; region: string; createdAt: string;
  theme: ThemeCode; status: AppealStatus; priority: Priority;
  channel: Channel | null; preview: string; isOverdue: boolean;
}
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }
export interface ClassifyResult {
  theme: ThemeCode; service: string; priority: Priority;
  language: Language; confidence: number;
  entities: { address: string | null; object: string | null; problem: string | null };
}
export interface ModelEvalTheme {
  theme: ThemeCode; precision: number; recall: number; f1: number; support: number;
}
export interface ModelEval {
  method: string; computedAt: string; nHoldout: number;
  accuracy: number; macroF1: number;
  perTheme: ModelEvalTheme[];
  confusion: { actual: ThemeCode; predicted: ThemeCode; n: number }[];
}

// --- ассистент оператора ---
export interface SimilarAppeal {
  id: string; createdAt: string; region: string; theme: ThemeCode;
  preview: string; serviceOrg: string | null; resolution: string | null;
  daysToClose: number | null; similarity: number;
}
export interface DuplicateInfo {
  nearDuplicates: SimilarAppeal[];
  repeats: SimilarAppeal[];       // тот же адрес, закрыто < 30 дн назад
}
export interface Template { id: number; themeCode: ThemeCode | null; serviceCode: string | null; lang: Language; title: string; body: string }

// --- meta ---
export interface Meta {
  regions: RegionRef[];
  themes: ThemeRef[];
  services: ServiceRef[];
  channels: { code: Channel; labelRu: string; labelKk: string }[];
  statuses: { code: AppealStatus; labelRu: string; labelKk: string }[];
}

