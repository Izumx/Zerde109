import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppealListItem, AppealStatus, Priority } from "@zerde/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { useFilters } from "@/lib/useFilters";
import { DataTable, type SortState } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { useAppeals } from "./api";

const STATUSES: AppealStatus[] = ["new", "routed", "in_progress", "done", "cancelled"];
const PRIORITIES: Priority[] = ["low", "medium", "high"];
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

const PRIO_VARIANT: Record<Priority, "secondary" | "default" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function QueueTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const meta = useMeta().data;
  const { filters } = useFilters();

  const [status, setStatus] = useState<AppealStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ id: "createdAt", desc: true });

  useEffect(() => {
    const h = setTimeout(() => setSearch(rawSearch.trim()), 300);
    return () => clearTimeout(h);
  }, [rawSearch]);

  // сброс страницы при любой смене фильтра
  useEffect(() => setPage(1), [status, priority, search, filters.region, filters.theme, filters.from, filters.to]);

  const q = useAppeals({
    ...filters,
    status: status || undefined,
    priority: priority || undefined,
    search: search || undefined,
    sort: sort.desc ? "created_desc" : "created_asc",
    page,
    pageSize: 50,
  });

  const themeLabel = (code: string): string =>
    meta?.themes.find((x) => x.code === code)?.nameRu ?? code;
  const regionLabel = (code: string): string =>
    meta?.regions.find((x) => x.code === code)?.nameRu ?? code;
  const statusLabel = (code: string): string =>
    meta?.statuses.find((x) => x.code === code)?.labelRu ?? code;

  const columns = useMemo<ColumnDef<AppealListItem, unknown>[]>(
    () => [
      { id: "sourceId", header: t("intake.queue.col.num"), accessorKey: "sourceId", enableSorting: false },
      { id: "createdAt", header: t("intake.queue.col.date"), accessorFn: (r) => fmtDate(r.createdAt) },
      { id: "region", header: t("intake.queue.col.region"), accessorFn: (r) => regionLabel(r.region), enableSorting: false },
      { id: "preview", header: t("intake.queue.col.preview"), accessorKey: "preview", enableSorting: false },
      { id: "theme", header: t("intake.queue.col.theme"), accessorFn: (r) => themeLabel(r.theme), enableSorting: false },
      {
        id: "priority",
        header: t("intake.queue.col.priority"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={PRIO_VARIANT[row.original.priority]}>{row.original.priority}</Badge>
        ),
      },
      { id: "status", header: t("intake.queue.col.status"), accessorFn: (r) => statusLabel(r.status), enableSorting: false },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, meta],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-9 min-w-56 flex-1 rounded-md border bg-background px-3 text-sm"
          placeholder={t("intake.queue.search")}
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
        />
        <select aria-label={t("intake.queue.status")} className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as AppealStatus | "")}>
          <option value="">{t("intake.queue.anyStatus")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <select aria-label={t("intake.queue.priority")} className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")}>
          <option value="">{t("intake.queue.anyPriority")}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={q.data?.items ?? []}
        total={q.data?.total}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(row) => navigate(`/appeals/${row.id}`)}
        isLoading={q.isLoading}
        density="compact"
      />
    </div>
  );
}
