import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { RangeFilter, ThemeCode } from "@zerde/types";

const KEYS = ["region", "from", "to", "theme"] as const;

export function useFilters(): {
  filters: RangeFilter;
  setFilters: (patch: Partial<RangeFilter>) => void;
} {
  const [sp, setSp] = useSearchParams();

  const filters = useMemo<RangeFilter>(
    () => ({
      region: sp.get("region") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      theme: (sp.get("theme") as ThemeCode | null) ?? undefined,
    }),
    [sp],
  );

  const setFilters = useCallback(
    (patch: Partial<RangeFilter>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const k of KEYS) {
            if (!(k in patch)) continue;
            const v = patch[k];
            if (v === undefined || v === null || v === "") next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  return { filters, setFilters };
}

export type PeriodPreset = "7d" | "30d" | "90d" | "custom";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Текущий пресет, выведенный из from/to. Нет дат → "30d"; иначе матч по длине или "custom". */
export function presetFromRange(f: RangeFilter): PeriodPreset {
  if (!f.from && !f.to) return "30d";
  if (f.from && f.to) {
    const days = Math.round((new Date(f.to).getTime() - new Date(f.from).getTime()) / 86_400_000);
    if (days === 7) return "7d";
    if (days === 30) return "30d";
    if (days === 90) return "90d";
  }
  return "custom";
}

/** from/to для пресета относительно «сегодня». */
export function rangeForPreset(preset: Exclude<PeriodPreset, "custom">): {
  from: string;
  to: string;
} {
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: isoDay(from), to: isoDay(to) };
}
