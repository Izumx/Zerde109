import { useMemo } from "react";
import type { ModelEvalTheme } from "@zerde/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { ApiError } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { fmtInt, fmtPct } from "@/lib/format";
import { useModelEval } from "./api";

export function ModelQualityTab() {
  const { t } = useTranslation();
  const meta = useMeta().data;
  const { data, isLoading, isError, error } = useModelEval();

  const themeLabel = (c: string): string => meta?.themes.find((x) => x.code === c)?.nameRu ?? c;

  const columns = useMemo<ColumnDef<ModelEvalTheme, unknown>[]>(
    () => [
      { id: "theme", header: t("intake.quality.col.theme"), accessorFn: (r) => themeLabel(r.theme), enableSorting: false },
      { id: "precision", header: t("intake.quality.col.precision"), accessorFn: (r) => fmtPct(r.precision), enableSorting: false },
      { id: "recall", header: t("intake.quality.col.recall"), accessorFn: (r) => fmtPct(r.recall), enableSorting: false },
      { id: "f1", header: t("intake.quality.col.f1"), accessorFn: (r) => fmtPct(r.f1), enableSorting: false },
      { id: "support", header: t("intake.quality.col.support"), accessorFn: (r) => fmtInt(r.support), enableSorting: false },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, meta],
  );

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (isError && error instanceof ApiError && error.code === "not_found") {
    return <EmptyState title={t("intake.quality.notComputed")} />;
  }
  if (isError || !data) return <div className="text-sm text-destructive">{t("common.error")}</div>;

  const themes = [...data.perTheme].sort((a, b) => b.f1 - a.f1);
  const topCodes = [...data.perTheme].sort((a, b) => b.support - a.support).slice(0, 8).map((x) => x.theme);
  const cell = new Map(data.confusion.map((c) => [`${c.actual}|${c.predicted}`, c.n]));
  const maxN = Math.max(1, ...data.confusion.map((c) => c.n));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <KpiCard label={t("intake.quality.accuracy")} value={fmtPct(data.accuracy)} />
        <KpiCard label={t("intake.quality.macroF1")} value={fmtPct(data.macroF1)} />
        <div className="flex flex-col justify-center text-xs text-muted-foreground">
          <span>{t("intake.quality.method")}: {data.method}</span>
          <span>{t("intake.quality.holdout")}: {fmtInt(data.nHoldout)}</span>
        </div>
      </div>

      <DataTable columns={columns} data={themes} density="compact" />

      <div>
        <div className="mb-2 text-sm font-medium">{t("intake.quality.confusion")}</div>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="p-1" />
                {topCodes.map((c) => (
                  <th key={c} className="max-w-16 truncate p-1 text-muted-foreground">{themeLabel(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCodes.map((a) => (
                <tr key={a}>
                  <th className="whitespace-nowrap p-1 text-right text-muted-foreground">{themeLabel(a)}</th>
                  {topCodes.map((p) => {
                    const n = cell.get(`${a}|${p}`) ?? 0;
                    return (
                      <td
                        key={p}
                        className="p-1 text-center tabular-nums"
                        style={{
                          background: `rgba(37,99,235,${(n / maxN) * 0.85})`,
                          color: n / maxN > 0.5 ? "#fff" : undefined,
                          outline: a === p ? "1px solid hsl(var(--border))" : undefined,
                        }}
                      >
                        {n || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
