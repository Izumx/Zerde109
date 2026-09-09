import { useTranslation } from "@/app/i18n";
import { KpiCard } from "@/components/KpiCard";
import { fmtDelta, fmtHours, fmtInt, fmtPct } from "@/lib/format";
import { useKpi } from "./api";

export function KpiRow() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useKpi();

  if (isError) {
    return <div className="text-sm text-destructive">{t("cc.kpi.error")}</div>;
  }

  const k = data;
  const cards = [
    { label: t("cc.kpi.total"), value: k ? fmtInt(k.total) : "—", delta: k?.deltaPct },
    { label: t("cc.kpi.openNow"), value: k ? fmtInt(k.openNow) : "—" },
    { label: t("cc.kpi.overdueShare"), value: k ? fmtPct(k.overdueShare) : "—" },
    { label: t("cc.kpi.avgClose"), value: k ? fmtHours(k.avgCloseHours) : "—" },
    { label: t("cc.kpi.repeatShare"), value: k ? fmtPct(k.repeatShare) : "—" },
    { label: t("cc.kpi.delta"), value: k ? fmtDelta(k.deltaPct) : "—", delta: k?.deltaPct },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <KpiCard key={c.label} label={c.label} value={c.value} delta={c.delta} isLoading={isLoading} />
      ))}
    </div>
  );
}
