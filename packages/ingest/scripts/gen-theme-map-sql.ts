import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SEEDS_DIR } from "../src/paths";
import { THEME_RULES } from "../src/themeRules";

const out = join(SEEDS_DIR, "04_theme_map.sql");

const values = THEME_RULES.map(
  (r) => `  ('${r.pattern.replace(/'/g, "''")}', 'ilike', '${r.themeCode}', ${r.priority})`,
).join(",\n");

const sql =
  `-- Сгенерировано из packages/ingest/src/themeRules.ts (scripts/gen-theme-map-sql.ts). Не редактировать вручную.\n` +
  `DELETE FROM theme_map;\n` +
  `INSERT INTO theme_map (pattern, match_type, theme_code, priority) VALUES\n${values};\n`;

await writeFile(out, sql, "utf8");
console.log(`wrote ${THEME_RULES.length} rules -> ${out}`);
