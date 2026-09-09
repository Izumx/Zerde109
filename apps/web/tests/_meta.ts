import { vi } from "vitest";
import type { Meta } from "@zerde/types";

export const META_FIXTURE: Meta = {
  regions: [
    { code: "akmola", nameRu: "Акмолинская область", nameKk: "Ақмола облысы", isActive: true },
    { code: "almaty", nameRu: "Алматинская область", nameKk: "Алматы облысы", isActive: true },
    { code: "abai", nameRu: "Область Абай", nameKk: "Абай облысы", isActive: false },
  ],
  themes: [
    { code: "water", nameRu: "Водоснабжение", nameKk: "Сумен жабдықтау", color: "#2563eb", sort: 1 },
    { code: "roads", nameRu: "Дороги", nameKk: "Жолдар", color: "#475569", sort: 6 },
  ],
  services: [{ code: "vodokanal", nameRu: "Водоканал", nameKk: "Су арнасы" }],
  channels: [{ code: "ekc109", labelRu: "ЕКЦ 109", labelKk: "ЕБО 109" }],
  statuses: [{ code: "in_progress", labelRu: "В работе", labelKk: "Жұмыста" }],
};

/** Стаб global fetch: /api/meta → META_FIXTURE, остальное → 200 {}. */
export function stubMetaFetch(meta: Meta = META_FIXTURE): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/meta") ? meta : {};
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }),
  );
}
