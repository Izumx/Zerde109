import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Абсолютный путь к каталогу `packages/ingest`. */
export const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Абсолютный путь к корню репозитория (`E:\Zerde109`). */
export const REPO_ROOT = join(PKG_ROOT, "..", "..");

export const MIGRATIONS_DIR = join(REPO_ROOT, "db", "migrations");
export const SEEDS_DIR = join(REPO_ROOT, "db", "seeds");

/**
 * True, если модуль `moduleUrl` был запущен напрямую как скрипт
 * (`tsx src/foo.ts`), а не импортирован. Кроссплатформенно, в отличие
 * от сравнения с `` `file://${process.argv[1]}` `` (ломается на Windows).
 */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return moduleUrl === pathToFileURL(entry).href;
}
