import type pg from "pg";
import type { Language, Template, ThemeCode } from "@zerde/types";

export async function getTemplates(
  pool: pg.Pool,
  opts: { theme?: ThemeCode; service?: string; lang?: Language } = {},
): Promise<Template[]> {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (opts.theme) {
    params.push(opts.theme);
    parts.push(`theme_code = $${params.length}`);
  }
  if (opts.service) {
    params.push(opts.service);
    parts.push(`service_code = $${params.length}`);
  }
  if (opts.lang) {
    params.push(opts.lang);
    parts.push(`lang = $${params.length}`);
  }

  const whereClause = parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "";
  const res = await pool.query<{
    id: number;
    theme_code: string | null;
    service_code: string | null;
    lang: string;
    title: string;
    body: string;
  }>(
    `SELECT id, theme_code, service_code, lang, title, body FROM templates ${whereClause} ORDER BY id`,
    params,
  );

  return res.rows.map((r) => ({
    id: r.id,
    themeCode: (r.theme_code as ThemeCode) ?? null,
    serviceCode: r.service_code,
    lang: r.lang as Language,
    title: r.title,
    body: r.body,
  }));
}
