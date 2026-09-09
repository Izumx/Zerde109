import { Link, useParams } from "react-router-dom";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { fmtDate } from "@/lib/format";
import { useAppeal } from "./api";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function AppealDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useAppeal(id);
  const meta = useMeta().data;

  const themeLabel = (c: string): string => meta?.themes.find((x) => x.code === c)?.nameRu ?? c;
  const statusLabel = (c: string): string => meta?.statuses.find((x) => x.code === c)?.labelRu ?? c;
  const regionLabel = (c: string): string => meta?.regions.find((x) => x.code === c)?.nameRu ?? c;
  const channelLabel = (c: string | null): string =>
    c ? (meta?.channels.find((x) => x.code === c)?.labelRu ?? c) : "—";

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p>{t("intake.detail.notFound")}</p>
        <Link to="/intake" className="text-primary underline">
          {t("intake.detail.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/intake" className="text-sm text-primary underline">
        {t("intake.detail.back")}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{data.sourceId}</h1>
        <Badge>{themeLabel(data.theme)}</Badge>
        <Badge variant="outline">{statusLabel(data.status)}</Badge>
        <Badge variant="secondary">{data.priority}</Badge>
        {data.isOverdue && <Badge variant="destructive">{t("intake.detail.overdue")}</Badge>}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border p-4 text-sm">
        <Field label={t("filter.region")} value={regionLabel(data.region)} />
        <Field label={t("intake.detail.district")} value={data.district} />
        <Field label={t("intake.detail.address")} value={data.address} />
        <Field label={t("intake.detail.channel")} value={channelLabel(data.channel)} />
        <Field label={t("intake.detail.type")} value={data.appealType} />
        <Field label={t("intake.detail.created")} value={fmtDate(data.createdAt)} />
        <Field label={t("intake.detail.closed")} value={data.closedAt ? fmtDate(data.closedAt) : null} />
        <Field label={t("intake.detail.deadline")} value={data.deadlineAt ? fmtDate(data.deadlineAt) : null} />
        <Field label={t("intake.detail.category")} value={data.rawCategory} />
        <Field label={t("intake.detail.subcategory")} value={data.subcategory} />
        <Field label={t("intake.detail.org")} value={data.serviceOrg} />
        <Field label={t("intake.detail.resolution")} value={data.resolution} />
      </dl>
    </div>
  );
}
