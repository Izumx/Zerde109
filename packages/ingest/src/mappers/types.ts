import type {
  AppealStatus, AppealType, Channel, Language, Priority, ThemeCode,
} from "@zerde/types";
import type { ThemeClassifier } from "../themeMap";

export type RawRow = Record<string, string>;

/** Нормализованное обращение до записи в БД (`id` строится загрузчиком). */
export interface NormalizedAppeal {
  sourceId: string;
  region: string;
  district: string | null;
  locality: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  createdAt: Date;
  closedAt: Date | null;
  deadlineAt: Date | null;
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

export type MapResult =
  | { ok: true; appeal: NormalizedAppeal }
  | { ok: false; reason: string };

export interface RegionMapper {
  region: string;
  /**
   * @param rowIndex Порядковый номер строки в объединённом потоке файлов региона.
   *   Стабилен между прогонами (файлы не меняются). Нужен источникам без своего
   *   ключа (Караганда) для уникальности синтетического id.
   */
  map(row: RawRow, classify: ThemeClassifier, rowIndex?: number): MapResult;
}
