import type { MapResult, NormalizedAppeal, RawRow, RegionMapper } from "./types";
import {
  buildSearchText, detectLanguage, normAppealType, normChannel, parseDateTime, priorityHeuristic,
} from "../normalize";
import { syntheticId } from "./syntheticId";

export const karagandaMapper: RegionMapper = {
  region: "karaganda",
  map(row: RawRow, classify, rowIndex = 0): MapResult {
    const createdAt = parseDateTime(row.created_date);
    if (!createdAt) return { ok: false, reason: "bad created_date" };

    const category = (row.category ?? "").trim();
    const sub = (row.sub_category ?? "").trim();
    const address = (row.appeal_address ?? "").trim();
    const org = (row.executor_gov_org ?? "").trim();
    const localityRaw = (row.region ?? "").trim();
    const districtRaw = (row.district ?? "").trim();
    const theme = classify([sub, category]);
    const appealType = normAppealType(row.appeal_type);
    const status = "done" as const;
    const closedAt = parseDateTime(row.updated_date);
    const isOverdue = false;

    const appeal: NormalizedAppeal = {
      sourceId: syntheticId([
        String(rowIndex), row.created_date, address, category, sub, org, row.appeal_type,
      ]),
      region: "karaganda",
      district: /район/i.test(districtRaw) ? districtRaw : null,
      locality: localityRaw || null,
      address: address || null,
      lat: null,
      lon: null,
      createdAt,
      closedAt,
      deadlineAt: null,
      theme,
      rawCategory: category || null,
      subcategory: sub || null,
      serviceOrg: org || null,
      status,
      rawStatus: null,
      appealType,
      channel: normChannel(row.source),
      language: detectLanguage(`${sub} ${category} ${address}`),
      priority: priorityHeuristic({ theme, appealType, isOverdue }),
      isOverdue,
      slaDays: null,
      grade: null,
      operator: null,
      resolution: null,
      searchText: buildSearchText([sub, category, address, org]),
    };
    return { ok: true, appeal };
  },
};
