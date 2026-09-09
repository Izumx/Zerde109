import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import "../src/loadEnv";
import { REPO_ROOT } from "../src/paths";

const SOURCE_DIR = resolve(
  REPO_ROOT,
  process.env.SOURCE_DIR ?? "Аналитика обращений граждан по call-центрам 109",
);
const DATA_DIR = resolve(REPO_ROOT, process.env.DATA_DIR ?? "data/raw");
const force = process.argv.includes("--force");

/** Подстрока в имени исходного файла → целевое ASCII-имя в DATA_DIR. */
const MAP: [RegExp, string][] = [
  [/Акмолинская/i, "akmola.csv"],
  [/Алматинская/i, "almaty.csv"],
  [/Восточно-Казахстанская/i, "east-kazakhstan.csv"],
  [/Карагандинская/i, "karaganda.csv"],
  [/Костанайская/i, "kostanay.csv"],
  [/Туркестанская/i, "turkestan.csv"],
  [/Павлодарская.*part_001/i, "pavlodar-1.csv"],
  [/Павлодарская.*part_002/i, "pavlodar-2.csv"],
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`SOURCE_DIR not found: ${SOURCE_DIR}`);
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });
const files = walk(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
let copied = 0;
for (const [re, target] of MAP) {
  const src = files.find((f) => re.test(f));
  if (!src) {
    console.warn(`! no source file matched ${target}`);
    continue;
  }
  const dest = join(DATA_DIR, target);
  if (existsSync(dest) && !force) {
    console.log(`= ${target} (exists, skip)`);
    continue;
  }
  copyFileSync(src, dest);
  copied += 1;
  console.log(`+ ${target}`);
}
console.log(`prepared ${copied} file(s) in ${DATA_DIR}`);
