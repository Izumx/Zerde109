import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { AppealListItem } from "@zerde/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { useAssigned } from "./api";

export function OperatorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const meta = useMeta().data;
  const q = useAssigned();

  const themeLabel = (c: string): string => meta?.themes.find((x) => x.code === c)?.nameRu ?? c;
  const statusLabel = (c: string): string => meta?.statuses.find((x) => x.code === c)?.labelRu ?? c;
  const regionLabel = (c: string): string => meta?.regions.find((x) => x.code === c)?.nameRu ?? c;

  const columns = useMemo<ColumnDef<AppealListItem, unknown>[]>(
    () => [
      { id: "sourceId", header: "№", accessorKey: "sourceId", enableSorting: false },
      { id: "createdAt", header: t("intake.queue.col.date"), accessorFn: (r) => fmtDate(r.createdAt), enableSorting: false },
      { id: "region", header: t("filter.region"), accessorFn: (r) => regionLabel(r.region), enableSorting: false },
      { id: "preview", header: t("intake.queue.col.preview"), accessorKey: "preview", enableSorting: false },
      { id: "theme", header: t("intake.queue.col.theme"), accessorFn: (r) => themeLabel(r.theme), enableSorting: false },
      {
        id: "priority",
        header: t("intake.queue.col.priority"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant="outline">{row.original.priority}</Badge>,
      },
      { id: "status", header: t("intake.queue.col.status"), accessorFn: (r) => statusLabel(r.status), enableSorting: false },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, meta],
  );

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">{t("operator.list.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("operator.list.hint")}</p>
      </div>

      {!q.isLoading && (q.data?.items.length ?? 0) === 0 ? (
        <EmptyState title={t("operator.list.empty")} />
      ) : (
        <DataTable
          columns={columns}
          data={q.data?.items ?? []}
          isLoading={q.isLoading}
          density="compact"
          onRowClick={(row) => navigate(`/operator/${row.id}`)}
        />
      )}
    </div>
  );
}
