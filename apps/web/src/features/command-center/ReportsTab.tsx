import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useFilters } from "@/lib/useFilters";
import { Button } from "@/components/ui/button";
import { downloadReport } from "./api";

type View = "overview" | "regions" | "themes";

export function ReportsTab() {
  const { t } = useTranslation();
  const { filters } = useFilters();
  const [view, setView] = useState<View>("overview");
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const go = async (format: "xlsx" | "pdf"): Promise<void> => {
    setBusy(format);
    try {
      await downloadReport(view, format, filters);
    } catch {
      toast.error(t("cc.reports.failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">{t("cc.reports.view")}</span>
        <select
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          value={view}
          onChange={(e) => setView(e.target.value as View)}
        >
          <option value="overview">{t("cc.reports.viewOverview")}</option>
          <option value="regions">{t("cc.reports.viewRegions")}</option>
          <option value="themes">{t("cc.reports.viewThemes")}</option>
        </select>
      </label>

      <div className="flex gap-2">
        <Button onClick={() => void go("xlsx")} disabled={busy !== null}>
          {busy === "xlsx" && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("cc.reports.xlsx")}
        </Button>
        <Button variant="outline" onClick={() => void go("pdf")} disabled={busy !== null}>
          {busy === "pdf" && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("cc.reports.pdf")}
        </Button>
      </div>
    </div>
  );
}
