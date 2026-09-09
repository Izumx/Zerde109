import { createHash } from "node:crypto";
import type { AppealStatus, AppealType, Channel, Language, Priority, ThemeCode } from "@zerde/types";

/** Исходные timestamp'ы — наивное локальное время; трактуем как Asia/Almaty. */
const TZ_OFFSET = "+05:00";

export function parseDateTime(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(s);
  if (m) {
    const [, y, mo, d, h, mi, se, frac] = m;
    const ms = frac ? Math.floor(Number(`0.${frac}`) * 1000) : 0;
    const date = new Date(
      `${y}-${mo}-${d}T${h}:${mi}:${se}.${String(ms).padStart(3, "0")}${TZ_OFFSET}`,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (m) {
    const [, d, mo, y, h, mi, se] = m;
    const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}.000${TZ_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}) (\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    const [, mo, d, yy, h, mi] = m;
    const y = 2000 + Number(yy);
    const p2 = (n: string): string => n.padStart(2, "0");
    const date = new Date(`${y}-${p2(mo!)}-${p2(d!)}T${p2(h!)}:${mi}:00.000${TZ_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function normStatusRu(raw: string | null | undefined): AppealStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s.includes("в работе")) return "in_progress";
  if (s.includes("отмен")) return "cancelled";
  return "done";
}

export function normStatusAkmola(raw: string | null | undefined): AppealStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s.includes("передано")) return "routed";
  if (s.includes("выполнен")) return "done";
  if (s.includes("в работе")) return "in_progress";
  if (s.includes("отклон")) return "cancelled";
  return "routed";
}

export function normStatusKostanay(raw: string | null | undefined): AppealStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s.includes("инициатором")) return "cancelled";
  return "done";
}

export function normStatusPavlodar(raw: string | null | undefined): AppealStatus {
  switch ((raw ?? "").trim().toUpperCase()) {
    case "CLOSED":
      return "done";
    case "PROCESSING":
      return "in_progress";
    case "WAITING_ORGANIZATION":
      return "routed";
    default:
      return "done";
  }
}

export function normChannel(raw: string | null | undefined): Channel | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.toLowerCase();
  if (/екц|call.?центр|call-центр|служба 109/.test(s)) return "ekc109";
  if (/whatsapp|ватсап/.test(s)) return "whatsapp";
  if (/instagram|инстаграм/.test(s)) return "instagram";
  if (/telegram|телеграм/.test(s)) return "telegram";
  if (/facebook|фейсбук/.test(s)) return "facebook";
  if (/smart qostanai|моб|mobile|приложение/.test(s)) return "mobile";
  if (/портал/.test(s)) return "web";
  if (/соц\.?\s*сети/.test(s)) return "social";
  if (/мониторинг/.test(s)) return "monitoring";
  return "other";
}

export function normAppealType(raw: string | null | undefined): AppealType | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.toLowerCase();
  if (/благодарн|thanks/.test(s)) return "gratitude";
  if (/предложен|suggestion/.test(s)) return "suggestion";
  if (/инцидент|incident/.test(s)) return "incident";
  if (/жалоб|complain/.test(s)) return "complaint";
  if (/консультац|consultation|справочн|запрос информ|запрос на информ|\binfo\b/.test(s)) {
    return "consultation";
  }
  if (/обращени/.test(s)) return "appeal";
  return "other";
}

const KK_GRAPHEMES = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/;
const KK_STOPWORDS = /\b(жоқ|бар|және|үшін|бойынша|деп|осы|бұл|қатарынан|күн)\b/i;

export function detectLanguage(text: string): Language {
  if (!text) return "ru";
  if (KK_GRAPHEMES.test(text)) return "kk";
  if (KK_STOPWORDS.test(text)) return "kk";
  return "ru";
}

const HIGH_UTILITY: ReadonlySet<ThemeCode> = new Set(["water", "electricity", "heating", "gas", "sewer"]);
const MEDIUM_THEMES: ReadonlySet<ThemeCode> = new Set(["roads", "lighting", "emergency"]);

export function priorityHeuristic(a: {
  theme: ThemeCode;
  appealType: AppealType | null;
  isOverdue: boolean;
}): Priority {
  if (a.isOverdue) return "high";
  if (a.appealType === "incident" && HIGH_UTILITY.has(a.theme)) return "high";
  if (a.appealType === "incident") return "medium";
  if (MEDIUM_THEMES.has(a.theme)) return "medium";
  return "low";
}

export function anonymizePhone(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  return createHash("sha256").update(raw.trim()).digest("hex").slice(0, 16);
}

export function buildSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
