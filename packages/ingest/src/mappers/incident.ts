import type { AppealType } from "@zerde/types";
import type { MapResult, NormalizedAppeal, RawRow, RegionMapper } from "./types";
import {
  buildSearchText, detectLanguage, normChannel, normStatusKostanay, parseDateTime, priorityHeuristic,
} from "../normalize";
import { computeOverdue } from "./shared";

const PLACEHOLDER = /^\/?-(\/-)*\/?$/;
const DISTRICT_RE = /район|ский$|скии$/i;

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Костанай и Туркестан делят схему инцидентов ЕСЕП. Отличие — колонка `result`
 * (есть только у Костаная).
 */
export function buildIncidentMapper(
  region: "kostanay" | "turkestan",
  hasResult: boolean,
): RegionMapper {
  return {
    region,
    map(row: RawRow, classify): MapResult {
      const sourceId = (row.incidentid ?? "").trim() || (row.incidentcode ?? "").trim();
      if (!sourceId) return { ok: false, reason: "no incidentid" };
      const createdAt = parseDateTime(row.createddate);
      if (!createdAt) return { ok: false, reason: "bad createddate" };

      const sl1 = (row.servicelevel1 ?? "").trim();
      const sl2 = (row.servicelevel2 ?? "").trim();
      const sl3raw = (row.servicelevel3 ?? "").trim();
      const sl3 = sl3raw && !PLACEHOLDER.test(sl3raw) ? sl3raw : "";
      const theme = classify([sl1, sl2, sl3]);
      const slaDays = num(row.sla);
      const deadlineAt =
        slaDays !== null ? new Date(createdAt.getTime() + slaDays * 86_400_000) : null;
      const closedAt = parseDateTime(row.finishdate);
      const status = normStatusKostanay(row.status);
      const isOverdue =
        /true/i.test((row.slabreach ?? "").trim()) || computeOverdue(deadlineAt, closedAt, status);
      const cat = (row.category ?? "").trim().toLowerCase();
      const appealType: AppealType = cat === "жалоба" ? "complaint" : "incident";
      const regionRaw = (row.region ?? "").trim();
      const result = hasResult ? (row.result ?? "").trim() : "";

      const appeal: NormalizedAppeal = {
        sourceId,
        region,
        district: DISTRICT_RE.test(regionRaw) ? regionRaw : null,
        locality: DISTRICT_RE.test(regionRaw) ? null : regionRaw || null,
        address: null,
        lat: num(row.ycoordinate),
        lon: num(row.xcoordinate),
        createdAt,
        closedAt,
        deadlineAt,
        theme,
        rawCategory: sl1 || null,
        subcategory: [sl2, sl3].filter(Boolean).join(" / ") || null,
        serviceOrg: (row.organizationname ?? "").trim() || null,
        status,
        rawStatus: (row.status ?? "").trim() || null,
        appealType,
        channel: normChannel(row.source),
        language: detectLanguage(`${sl1} ${sl2} ${result}`),
        priority: priorityHeuristic({ theme, appealType, isOverdue }),
        isOverdue,
        slaDays,
        grade: num(row.grade),
        operator: null,
        resolution: result || null,
        searchText: buildSearchText([sl1, sl2, sl3, result, row.organizationname]),
      };
      return { ok: true, appeal };
    },
  };
}
