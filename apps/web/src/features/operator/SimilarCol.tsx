import { useState } from "react";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { fmtPct } from "@/lib/format";
import { useSimilar } from "./api";

export function SimilarCol({
  id,
  onUseResolution,
}: {
  id: string | undefined;
  onUseResolution: (text: string) => void;
}) {
  const { t } = useTranslation();
  const meta = useMeta().data;
  const [onlyResolved, setOnlyResolved] = useState(false);
  const { data, isLoading, isError } = useSimilar(id);

  const themeLabel = (c: string): string => meta?.themes.find((x) => x.code === c)?.nameRu ?? c;
  const rows = (data ?? []).filter((s) => !onlyResolved || s.resolution);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{t("operator.ws.similar")}</CardTitle>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyResolved}
            onChange={(e) => setOnlyResolved(e.target.checked)}
          />
          {t("operator.ws.onlyResolved")}
        </label>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && <LoadingSkeleton rows={4} />}
        {isError && <p className="text-muted-foreground">{t("common.error")}</p>}
        {!isLoading && !isError && rows.length === 0 && <EmptyState />}
        {rows.map((s) => (
          <div key={s.id} className="space-y-1 rounded-md border p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{themeLabel(s.theme)}</Badge>
              <span className="text-xs text-muted-foreground">
                {t("operator.ws.similarity")} {fmtPct(s.similarity)}
              </span>
              {s.daysToClose != null && (
                <span className="text-xs text-muted-foreground">
                  · {s.daysToClose} {t("operator.ws.days")}
                </span>
              )}
            </div>
            <p className="line-clamp-2">{s.preview}</p>
            {s.serviceOrg && <p className="text-xs text-muted-foreground">{s.serviceOrg}</p>}
            {s.resolution && (
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.resolution}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onUseResolution(s.resolution!)}
                >
                  {t("operator.ws.useResolution")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
