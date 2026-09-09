import type { AppealType } from "@zerde/types";
import type { MapResult, NormalizedAppeal, RawRow, RegionMapper } from "./types";
import {
  buildSearchText, detectLanguage, normChannel, normStatusRu, parseDateTime, priorityHeuristic,
} from "../normalize";

const ID_RE = /^KZ\d{6,}/i;

export const almatyMapper: RegionMapper = {
  region: "almaty",
  map(row: RawRow, classify): MapResult {
    const sourceId = (row.application_number ?? "").trim();
    if (!ID_RE.test(sourceId)) return { ok: false, reason: "bad application_number" };

    const createdAt = parseDateTime(row.creation_date);
    if (!createdAt) return { ok: false, reason: "bad creation_date" };

    const category = (row.category ?? "").trim();
    const service = (row.service ?? "").trim();
    const result = (row.result ?? "").trim();
    const comExp = (row.com_exp ?? "").trim();
    const theme = classify([category, service]);
    const closedAt = parseDateTime(row.closing_date);
    const status = normStatusRu(row.status || row.status_1);

    let appealType: AppealType | null = null;
    if (/справочн|консультац/i.test(category) || /решен консультац/i.test(result)) {
      appealType = "consultation";
    } else if (/устранена|устранено/i.test(result) || /устран/i.test(comExp)) {
      appealType = "incident";
    } else if (/невозможно устранить/i.test(result)) {
      appealType = "complaint";
    }

    const isOverdue = false;
    const appeal: NormalizedAppeal = {
      sourceId,
      region: "almaty",
      district: null,
      locality: null,
      address: null,
      lat: null,
      lon: null,
      createdAt,
      closedAt,
      deadlineAt: null,
      theme,
      rawCategory: category || null,
      subcategory: service || null,
      serviceOrg: (row.contractor ?? "").trim() || null,
      status,
      rawStatus: (row.status ?? "").trim() || null,
      appealType,
      channel: normChannel(row.submittal_channel),
      language: detectLanguage(`${category} ${service} ${comExp} ${result}`),
      priority: priorityHeuristic({ theme, appealType, isOverdue }),
      isOverdue,
      slaDays: null,
      grade: null,
      operator: null,
      resolution: result || comExp || null,
      searchText: buildSearchText([category, service, comExp, result]),
    };
    return { ok: true, appeal };
  },
};
