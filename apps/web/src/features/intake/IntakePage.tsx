import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/app/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueueTab } from "./QueueTab";
import { ClassifyPanel } from "./ClassifyPanel";
import { ModelQualityTab } from "./ModelQualityTab";

const TABS = ["queue", "classify", "quality"] as const;
type Tab = (typeof TABS)[number];

export function IntakePage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const tab = (TABS.includes(sp.get("tab") as Tab) ? sp.get("tab") : "queue") as Tab;
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
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        {TABS.map((x) => (
          <TabsTrigger key={x} value={x}>
            {t(`intake.tab.${x}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="queue">
        <QueueTab />
      </TabsContent>
      <TabsContent value="classify">
        <ClassifyPanel />
      </TabsContent>
      <TabsContent value="quality">
        <ModelQualityTab />
      </TabsContent>
    </Tabs>
  );
}
