import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/app/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiRow } from "./KpiRow";
import { OverviewTab } from "./OverviewTab";
import { SpikesTab } from "./SpikesTab";
import { ForecastTab } from "./ForecastTab";
import { NlQueryTab } from "./NlQueryTab";
import { ReportsTab } from "./ReportsTab";

const TABS = ["overview", "spikes", "forecast", "query", "reports"] as const;
type Tab = (typeof TABS)[number];

export function CommandCenterPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const tab = (TABS.includes(sp.get("tab") as Tab) ? sp.get("tab") : "overview") as Tab;
  const setTab = (v: string): void =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", v);
        return next;
      },
      { replace: true },
    );

  return (
    <div className="space-y-6">
      <KpiRow />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((x) => (
            <TabsTrigger key={x} value={x}>
              {t(`cc.tab.${x}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="spikes" className="mt-4">
          <SpikesTab onDrill={() => setTab("overview")} />
        </TabsContent>
        <TabsContent value="forecast" className="mt-4">
          <ForecastTab />
        </TabsContent>
        <TabsContent value="query" className="mt-4">
          <NlQueryTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
