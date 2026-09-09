import type { MapResult, NormalizedAppeal, RawRow, RegionMapper } from "./types";
import {
  anonymizePhone, buildSearchText, detectLanguage, normAppealType, normChannel,
  normStatusRu, parseDateTime, priorityHeuristic,
} from "../normalize";

const ID_RE = /^KZ\d{6,}/i;

export const eastKazakhstanMapper: RegionMapper = {
  region: "east-kazakhstan",
  map(row: RawRow, classify): MapResult {
    const sourceId = (row.application_number ?? "").trim();
    if (!ID_RE.test(sourceId)) return { ok: false, reason: "bad application_number" };
    const createdAt = parseDateTime(row.creation_date);
    if (!createdAt) return { ok: false, reason: "bad creation_date" };

    const category = (row.category ?? "").trim();
    const service = (row.service ?? "").trim();
    const regionRaw = (row.region ?? "").trim();
    const districtRaw = (row.district ?? "").trim();
    const street = (row.street ?? "").trim();
    const result = (row.result ?? "").trim();
    const comExp = (row.com_exp ?? "").trim();
    const theme = classify([service, category]);
    const status = normStatusRu(row.status);
    const closedAt = parseDateTime(row.closing_date);
    const appealType = normAppealType(row.application_type);
    const isOverdue = false;
    // PII: телефон не тащим в витрину v1 (хэш доступен, но не сохраняется); ФИО отбрасываем.
    void anonymizePhone(row.applicant_number);

    const appeal: NormalizedAppeal = {
      sourceId,
      region: "east-kazakhstan",
      district: /район/i.test(districtRaw)
        ? districtRaw
        : /район/i.test(regionRaw)
          ? regionRaw
          : null,
      locality: /район/i.test(regionRaw) ? null : regionRaw || null,
      address: street || null,
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
      language: detectLanguage(`${category} ${service} ${comExp}`),
      priority: priorityHeuristic({ theme, appealType, isOverdue }),
      isOverdue,
      slaDays: null,
      grade: null,
      operator: (row.operator ?? "").trim() || null,
      resolution: result || comExp || null,
      searchText: buildSearchText([category, service, street, comExp, result]),
    };
    return { ok: true, appeal };
  },
};
