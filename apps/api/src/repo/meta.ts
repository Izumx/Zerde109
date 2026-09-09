import type pg from "pg";
import type { Meta } from "@zerde/types";
import { q } from "../db";

const CHANNELS: Meta["channels"] = [
  { code: "ekc109", labelRu: "ЕКЦ 109", labelKk: "ЕБО 109" },
  { code: "whatsapp", labelRu: "WhatsApp", labelKk: "WhatsApp" },
  { code: "instagram", labelRu: "Instagram", labelKk: "Instagram" },
  { code: "telegram", labelRu: "Telegram", labelKk: "Telegram" },
  { code: "facebook", labelRu: "Facebook", labelKk: "Facebook" },
  { code: "mobile", labelRu: "Мобильное приложение", labelKk: "Мобильді қосымша" },
  { code: "web", labelRu: "Портал", labelKk: "Портал" },
  { code: "social", labelRu: "Соцсети", labelKk: "Әлеуметтік желілер" },
  { code: "monitoring", labelRu: "Мониторинг", labelKk: "Мониторинг" },
  { code: "other", labelRu: "Другое", labelKk: "Басқа" },
];
const STATUSES: Meta["statuses"] = [
  { code: "new", labelRu: "Новое", labelKk: "Жаңа" },
  { code: "routed", labelRu: "Передано в службу", labelKk: "Қызметке берілді" },
  { code: "in_progress", labelRu: "В работе", labelKk: "Жұмыста" },
  { code: "done", labelRu: "Выполнено", labelKk: "Орындалды" },
  { code: "cancelled", labelRu: "Отменено", labelKk: "Бас тартылды" },
];

export async function getMeta(pool: pg.Pool): Promise<Meta> {
  const regions = await q<{ code: string; name_ru: string; name_kk: string; is_active: boolean }>(
    pool, "SELECT code, name_ru, name_kk, is_active FROM regions ORDER BY is_active DESC, name_ru",
  );
  const themes = await q<{ code: string; name_ru: string; name_kk: string; color: string; sort: number }>(
    pool, "SELECT code, name_ru, name_kk, color, sort FROM themes ORDER BY sort",
  );
  const services = await q<{ code: string; name_ru: string; name_kk: string }>(
    pool, "SELECT code, name_ru, name_kk FROM services ORDER BY name_ru",
  );
  return {
    regions: regions.map((r) => ({ code: r.code, nameRu: r.name_ru, nameKk: r.name_kk, isActive: r.is_active })),
    themes: themes.map((t) => ({ code: t.code as never, nameRu: t.name_ru, nameKk: t.name_kk, color: t.color, sort: t.sort })),
    services: services.map((s) => ({ code: s.code, nameRu: s.name_ru, nameKk: s.name_kk })),
    channels: CHANNELS,
    statuses: STATUSES,
  } satisfies Meta;
}
