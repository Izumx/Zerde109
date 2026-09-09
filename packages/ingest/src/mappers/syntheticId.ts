import { createHash } from "node:crypto";

/**
 * Детерминированный ключ из содержимого строки — для источников без своего
 * идентификатора (Караганда). Редкие коллизии допустимы: загрузчик делает
 * `ON CONFLICT (id) DO UPDATE`.
 */
export function syntheticId(parts: (string | null | undefined)[]): string {
  return createHash("sha256")
    .update(parts.map((p) => p ?? "").join("|"))
    .digest("hex")
    .slice(0, 24);
}
