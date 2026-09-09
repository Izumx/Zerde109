import { useTranslation } from "@/app/i18n";
import { useMeta, useRegionOptions, useThemeOptions } from "@/lib/useMeta";
import {
  presetFromRange,
  rangeForPreset,
  useFilters,
  type PeriodPreset,
} from "@/lib/useFilters";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

const PRESETS: Exclude<PeriodPreset, "custom">[] = ["7d", "30d", "90d"];

const selectCls =
  "h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function FilterBar() {
  const { t } = useTranslation();
  const { isLoading } = useMeta();
  const regions = useRegionOptions();
  const themes = useThemeOptions();
  const { filters, setFilters } = useFilters();
  const preset = presetFromRange(filters);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t("filter.region")}
        className={cn(selectCls, "w-[190px]")}
        value={filters.region ?? ""}
        onChange={(e) => setFilters({ region: e.target.value || undefined })}
      >
        <option value="">{t("filter.allRegions")}</option>
        {regions.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>

      <div
        className="inline-flex overflow-hidden rounded-md border text-xs"
        role="group"
        aria-label={t("filter.period")}
      >
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFilters(rangeForPreset(p))}
            className={cn(
              "px-2.5 py-2 transition-colors",
              preset === p ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {t(`period.${p}`)}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            "px-2.5 py-2 transition-colors",
            preset === "custom" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          )}
          onClick={() => setFilters(filters.from && filters.to ? {} : rangeForPreset("30d"))}
        >
          {t("period.custom")}
        </button>
        {preset === "custom" && (
          <>
            <input
              type="date"
              aria-label="from"
              value={filters.from ?? ""}
              onChange={(e) => setFilters({ from: e.target.value || undefined })}
              className="border-l bg-transparent px-1.5 py-1"
            />
            <input
              type="date"
              aria-label="to"
              value={filters.to ?? ""}
              onChange={(e) => setFilters({ to: e.target.value || undefined })}
              className="border-l bg-transparent px-1.5 py-1"
            />
          </>
        )}
      </div>

      <select
        aria-label={t("filter.theme")}
        className={cn(selectCls, "w-[180px]")}
        value={filters.theme ?? ""}
        onChange={(e) => setFilters({ theme: (e.target.value || undefined) as never })}
      >
        <option value="">{t("filter.allThemes")}</option>
        {themes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
