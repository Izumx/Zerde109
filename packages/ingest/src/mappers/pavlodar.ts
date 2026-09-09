import type { MapResult, NormalizedAppeal, RawRow, RegionMapper } from "./types";
import {
  buildSearchText, detectLanguage, normAppealType, normStatusPavlodar, parseDateTime, priorityHeuristic,
} from "../normalize";

export const pavlodarMapper: RegionMapper = {
  region: "pavlodar",
  map(row: RawRow, classify): MapResult {
    const sourceId = (row.id ?? "").trim() || (row.public_code ?? "").trim();
    if (!sourceId) return { ok: false, reason: "no id/public_code" };
    const createdAt = parseDateTime(row.create_date);
    if (!createdAt) return { ok: false, reason: "bad create_date" };

    const categoryName = (row.category_name ?? "").trim();
    const serviceName = (row.service_name ?? "").trim();
    const theme = classify([categoryName, serviceName]);
    const status = normStatusPavlodar(row.status);
    const appealType = normAppealType(row.request_type);
    const isOverdue = false;

    const appeal: NormalizedAppeal = {
      sourceId,
      region: "pavlodar",
      district: null,
      locality: null,
      address: null,
      lat: null,
      lon: null,
      createdAt,
      closedAt: null,
      deadlineAt: null,
      theme,
      rawCategory: categoryName || null,
      subcategory: serviceName || null,
      serviceOrg: null,
      status,
      rawStatus: (row.status ?? "").trim() || null,
      appealType,
      channel: null,
      language: detectLanguage(`${categoryName} ${serviceName}`),
      priority: priorityHeuristic({ theme, appealType, isOverdue }),
      isOverdue,
      slaDays: null,
      grade: null,
      operator: null,
      resolution: null,
      searchText: buildSearchText([categoryName, serviceName]),
    };
    return { ok: true, appeal };
  },
};
