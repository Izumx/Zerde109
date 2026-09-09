import { AlertTriangle } from "lucide-react";
import type { SpikeRow } from "@zerde/types";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { useFilters } from "@/lib/useFilters";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { useSpikes } from "./api";

const SEV_VARIANT: Record<SpikeRow["severity"], "secondary" | "default" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function SpikesTab({ onDrill }: { onDrill?: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSpikes();
  const { setFilters } = useFilters();
  const meta = useMeta().data;

  const themeLabel = (code: string): string =>
    meta?.themes.find((x) => x.code === code)?.nameRu ?? code;
  const regionLabel = (code: string): string =>
    meta?.regions.find((x) => x.code === code)?.nameRu ?? code;

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (isError) return <div className="text-sm text-destructive">{t("common.error")}</div>;
  if (!data || data.length === 0) return <EmptyState title={t("cc.spikes.empty")} />;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("cc.spikes.col.region")}</th>
            <th className="px-3 py-2">{t("cc.spikes.col.theme")}</th>
            <th className="px-3 py-2">{t("cc.spikes.col.day")}</th>
            <th className="px-3 py-2">{t("cc.spikes.col.growth")}</th>
            <th className="px-3 py-2">{t("cc.spikes.col.severity")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr
              key={`${s.region}-${s.theme}-${s.day}`}
              className="cursor-pointer border-t hover:bg-accent"
              onClick={() => {
                setFilters({ region: s.region, theme: s.theme });
                onDrill?.();
              }}
            >
              <td className="px-3 py-2">{regionLabel(s.region)}</td>
              <td className="px-3 py-2">{themeLabel(s.theme)}</td>
              <td className="px-3 py-2 tabular-nums">{fmtDate(s.day)}</td>
              <td className="px-3 py-2 font-medium">
                +{Math.round((s.ratio - 1) * 100)}%
              </td>
              <td className="px-3 py-2">
                <Badge variant={SEV_VARIANT[s.severity]} className="gap-1">
                  <AlertTriangle className="size-3" />
                  {s.severity}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
