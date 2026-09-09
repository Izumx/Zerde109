import { useState } from "react";
import type { ThemeCode } from "@zerde/types";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { useFilters } from "@/lib/useFilters";
import { ChartCard } from "@/components/ChartCard";
import { DataTable } from "@/components/DataTable";
import { LineChartFig } from "@/components/charts/LineChartFig";
import { fmtInt } from "@/lib/format";
import { useForecast } from "./api";

const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export function ForecastTab() {
  const { t } = useTranslation();
  const meta = useMeta().data;
  const { filters } = useFilters();
  const [region, setRegion] = useState<string>(filters.region ?? "akmola");
  const [theme, setTheme] = useState<ThemeCode>((filters.theme as ThemeCode) ?? "water");

  const { data, isLoading, isError, refetch } = useForecast(region, theme);

  type Row = {
    month: string;
    history?: number;
    forecast?: number;
    yhatLower?: number;
    yhatUpper?: number;
  };
  const merged: Row[] = [
    ...(data?.history ?? []).map((h): Row => ({ month: h.month, history: h.count })),
    ...(data?.forecast ?? []).map(
      (f): Row => ({ month: f.month, forecast: f.yhat, yhatLower: f.yhatLower, yhatUpper: f.yhatUpper }),
    ),
  ];

  return (
    <ChartCard
      title={t("cc.forecast.title")}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && merged.length === 0}
      onRetry={() => void refetch()}
      tableSlot={
        <DataTable
          columns={[
            { id: "month", header: t("cc.forecast.method"), accessorKey: "month" },
            { id: "history", header: t("cc.forecast.history"), accessorFn: (r) => (r.history != null ? fmtInt(r.history) : "") },
            { id: "forecast", header: t("cc.forecast.forecast"), accessorFn: (r) => (r.forecast != null ? fmtInt(r.forecast) : "") },
          ]}
          data={merged}
          density="compact"
        />
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label={t("cc.forecast.region")} className={selectCls} value={region} onChange={(e) => setRegion(e.target.value)}>
          {(meta?.regions ?? []).filter((r) => r.isActive).map((r) => (
            <option key={r.code} value={r.code}>{r.nameRu}</option>
          ))}
        </select>
        <select aria-label={t("cc.forecast.theme")} className={selectCls} value={theme} onChange={(e) => setTheme(e.target.value as ThemeCode)}>
          {(meta?.themes ?? []).map((x) => (
            <option key={x.code} value={x.code}>{x.nameRu}</option>
          ))}
        </select>
      </div>

      <LineChartFig
        data={merged}
        xKey="month"
        band={{ lowerKey: "yhatLower", upperKey: "yhatUpper", color: "#2a78d6" }}
        series={[
          { key: "history", label: t("cc.forecast.history"), color: "#2a78d6" },
          { key: "forecast", label: t("cc.forecast.forecast"), color: "#eb6834", dashed: true },
        ]}
      />
      {data && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("cc.forecast.method")}: {data.method}
        </p>
      )}
    </ChartCard>
  );
}
