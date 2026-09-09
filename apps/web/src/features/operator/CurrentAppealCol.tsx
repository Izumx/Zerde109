import type { Appeal } from "@zerde/types";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { useAppeal } from "@/features/intake/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { fmtDate } from "@/lib/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function CurrentAppealCol({ id, appeal }: { id: string | undefined; appeal?: Appeal }) {
  const { t } = useTranslation();
  const meta = useMeta().data;
  const q = useAppeal(appeal ? undefined : id);
  const a = appeal ?? q.data;

  const themeLabel = (c: string): string => meta?.themes.find((x) => x.code === c)?.nameRu ?? c;
  const statusLabel = (c: string): string => meta?.statuses.find((x) => x.code === c)?.labelRu ?? c;
  const regionLabel = (c: string): string => meta?.regions.find((x) => x.code === c)?.nameRu ?? c;
  const channelLabel = (c: string | null): string =>
    c ? (meta?.channels.find((x) => x.code === c)?.labelRu ?? c) : "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("operator.ws.current")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {!a && q.isLoading && <LoadingSkeleton rows={6} />}
        {!a && q.isError && <p className="text-muted-foreground">{t("operator.ws.notFound")}</p>}
        {a && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{a.sourceId}</span>
              <Badge>{themeLabel(a.theme)}</Badge>
              <Badge variant="outline">{statusLabel(a.status)}</Badge>
              <Badge variant="secondary">{a.priority}</Badge>
              {a.isOverdue && <Badge variant="destructive">{t("intake.detail.overdue")}</Badge>}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <Row label={t("filter.region")} value={regionLabel(a.region)} />
              <Row label={t("intake.detail.district")} value={a.district} />
              <Row label={t("intake.detail.address")} value={a.address} />
              <Row label={t("intake.detail.channel")} value={channelLabel(a.channel)} />
              <Row label={t("intake.detail.type")} value={a.appealType} />
              <Row label={t("intake.detail.created")} value={fmtDate(a.createdAt)} />
              <Row label={t("intake.detail.deadline")} value={a.deadlineAt ? fmtDate(a.deadlineAt) : null} />
              <Row label={t("intake.detail.category")} value={a.rawCategory} />
              <Row label={t("intake.detail.subcategory")} value={a.subcategory} />
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
