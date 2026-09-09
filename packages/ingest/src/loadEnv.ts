import { existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { REPO_ROOT } from "./paths";

/**
 * Подгружает `<repoRoot>/.env` в `process.env` (не перезаписывая уже заданные).
 * Импортируется как side-effect в точках входа-скриптах и в vitest setup.
 */
const envPath = join(REPO_ROOT, ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
}
