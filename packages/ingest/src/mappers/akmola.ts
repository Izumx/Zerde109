import type { MapResult, NormalizedAppeal, RawRow, RegionMapper } from "./types";
import {
  buildSearchText, detectLanguage, normStatusAkmola, parseDateTime, priorityHeuristic,
} from "../normalize";
import { computeOverdue, daysBetween } from "./shared";

const GEO_RE = /^г\.|район|город|село|посёл|аул/i;
const ORG_RE = /ГКП|ГУ|ТОО|СПП|АО|«|передано/i;

export const akmolaMapper: RegionMapper = {
  region: "akmola",
  map(row: RawRow, classify): MapResult {
    const sourceId = (row.request_number ?? "").trim();
    if (!sourceId) return { ok: false, reason: "no request_number" };

    const createdAt = parseDateTime(row.creation_date);
    if (!createdAt) return { ok: false, reason: "bad creation_date" };

    const direction = (row.direction ?? "").trim();
    const geo = (row.region_g_a ?? "").trim();
    if (!direction && !GEO_RE.test(geo)) return { ok: false, reason: "row appears column-shifted" };

    const deadlineAt =
      parseDateTime(row.completion_deadline) ?? parseDateTime(row.planned_closing_date);
    const status = normStatusAkmola(row.status);
    const closedAt = status === "done" ? deadlineAt : null;
    const isOverdue = computeOverdue(deadlineAt, closedAt, status);
    const theme = classify([direction]);
    const subject = (row.request_subject ?? "").trim();
    const appealType = null;

    const appeal: NormalizedAppeal = {
      sourceId,
      region: "akmola",
      district: /район/i.test(geo) ? geo : null,
      locality: /район/i.test(geo) ? null : geo || null,
      address: null,
      lat: null,
      lon: null,
      createdAt,
      closedAt,
      deadlineAt,
      theme,
      rawCategory: direction || null,
      subcategory: null,
      serviceOrg: ORG_RE.test(subject) ? subject : null,
      status,
      rawStatus: (row.status ?? "").trim() || null,
      appealType,
      channel: "ekc109",
      language: detectLanguage(`${direction} ${subject}`),
      priority: priorityHeuristic({ theme, appealType, isOverdue }),
      isOverdue,
      slaDays: deadlineAt ? daysBetween(createdAt, deadlineAt) : null,
      grade: null,
      operator: null,
      resolution: null,
      searchText: buildSearchText([direction, subject, geo]),
    };
    return { ok: true, appeal };
  },
};
