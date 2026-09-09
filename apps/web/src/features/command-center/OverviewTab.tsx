import { useState } from "react";
import type { Granularity } from "@zerde/types";
import { useTranslation } from "@/app/i18n";
import { ChartCard } from "@/components/ChartCard";
import { RankedBarList } from "@/components/RankedBarList";
import { DataTable } from "@/components/DataTable";
import { LineChartFig } from "@/components/charts/LineChartFig";
import { BarChartFig } from "@/components/charts/BarChartFig";
import { useSeriesColors } from "@/components/charts/chartTheme";
import { useFilters } from "@/lib/useFilters";
import { fmtInt } from "@/lib/format";
import { useBreakdown, useTimeseries } from "./api";

const GRANS: Granularity[] = ["day", "week", "month"];

export function OverviewTab() {
  const { t } = useTranslation();
  const { setFilters } = useFilters();
  const [gran, setGran] = useState<Granularity>("month");
  const colorsFor = useSeriesColors();

  const ts = useTimeseries(gran);
  const byTheme = useBreakdown("theme");
  const byRegion = useBreakdown("region");

  const themeRows = (byTheme.data ?? []).slice();
  const themeColors = colorsFor(themeRows.map((r) => r.key));
  const topThemes = [...themeRows].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title={t("cc.overview.dynamics")}
        isLoading={ts.isLoading}
        isError={ts.isError}
        isEmpty={!ts.isLoading && (ts.data?.points.length ?? 0) === 0}
        onRetry={() => void ts.refetch()}
        tableSlot={
          <DataTable
            columns={[
              { id: "bucket", header: t("cc.overview.granularity"), accessorKey: "bucket" },
              { id: "count", header: t("cc.overview.count"), accessorKey: "count" },
              { id: "overdue", header: t("cc.overview.overdue"), accessorKey: "overdue" },
            ]}
            data={ts.data?.points ?? []}
            density="compact"
          />
        }
      >
        <div className="mb-2">
          <select
            aria-label={t("cc.overview.granularity")}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={gran}
            onChange={(e) => setGran(e.target.value as Granularity)}
          >
            {GRANS.map((g) => (
              <option key={g} value={g}>
                {t(`period.${g === "day" ? "7d" : g === "week" ? "30d" : "90d"}`)}
              </option>
            ))}
          </select>
        </div>
        <LineChartFig
          data={(ts.data?.points ?? []) as unknown as Record<string, number | string>[]}
          xKey="bucket"
          series={[
            { key: "count", label: t("cc.overview.count"), color: "#2a78d6" },
            { key: "overdue", label: t("cc.overview.overdue"), color: "#e34948" },
          ]}
        />
      </ChartCard>

      <ChartCard
        title={t("cc.overview.byTheme")}
        isLoading={byTheme.isLoading}
        isError={byTheme.isError}
        isEmpty={!byTheme.isLoading && themeRows.length === 0}
        onRetry={() => void byTheme.refetch()}
      >
        <RankedBarList
          items={themeRows.map((r) => ({
            key: r.key,
            label: r.label,
            value: r.count,
            color: themeColors[r.key],
          }))}
          onItemClick={(key) => setFilters({ theme: key as never })}
        />
      </ChartCard>

      <ChartCard
        title={t("cc.overview.byRegion")}
        isLoading={byRegion.isLoading}
        isError={byRegion.isError}
        isEmpty={!byRegion.isLoading && (byRegion.data?.length ?? 0) === 0}
        onRetry={() => void byRegion.refetch()}
      >
        <RankedBarList
          items={(byRegion.data ?? []).map((r) => ({ key: r.key, label: r.label, value: r.count }))}
          onItemClick={(key) => setFilters({ region: key })}
        />
      </ChartCard>

      <ChartCard
        title={t("cc.overview.topThemes")}
        isLoading={byTheme.isLoading}
        isError={byTheme.isError}
        isEmpty={!byTheme.isLoading && topThemes.length === 0}
        onRetry={() => void byTheme.refetch()}
        tableSlot={
          <DataTable
            columns={[
              { id: "label", header: t("cc.overview.byTheme"), accessorKey: "label" },
              { id: "count", header: t("cc.overview.count"), accessorFn: (r) => fmtInt(r.count) },
              {
                id: "delta",
                header: "Δ",
                accessorFn: (r) => `${Math.round(r.deltaPct * 100)}%`,
              },
            ]}
            data={topThemes}
            density="compact"
          />
        }
      >
        <BarChartFig
          data={topThemes.map((r) => ({
            key: r.key,
            label: r.label,
            value: r.count,
            color: themeColors[r.key],
          }))}
          onBarClick={(key) => setFilters({ theme: key as never })}
        />
      </ChartCard>
    </div>
  );
}
