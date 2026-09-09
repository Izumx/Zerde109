import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Appeal } from "@zerde/types";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { THEME_SERVICE } from "@/lib/themeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDuplicates, useRoute, useTemplates } from "./api";

const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function DraftCol({ appeal, initialDraft }: { appeal: Appeal; initialDraft?: string }) {
  const { t } = useTranslation();
  const meta = useMeta().data;
  const [draft, setDraft] = useState("");
  const [service, setService] = useState<string>(THEME_SERVICE[appeal.theme] ?? "akimat");

  const dup = useDuplicates(appeal.id);
  const tpls = useTemplates(appeal.theme);
  const route = useRoute(appeal.id);

  useEffect(() => {
    if (initialDraft) setDraft(initialDraft);
  }, [initialDraft]);

  const serviceLabel = (c: string): string => meta?.services.find((x) => x.code === c)?.nameRu ?? c;

  const applyTemplate = (id: string): void => {
    const tpl = tpls.data?.find((x) => String(x.id) === id);
    if (!tpl) return;
    setDraft(
      tpl.body
        .replaceAll("{address}", appeal.address ?? "—")
        .replaceAll("{service}", serviceLabel(service)),
    );
  };

  const act = (kind: "route" | "draft" | "mark_duplicate", payload: Record<string, unknown>) =>
    route.mutate(
      { kind, payload },
      {
        onSuccess: () =>
          toast.success(
            kind === "route"
              ? t("operator.ws.routed")
              : kind === "draft"
                ? t("operator.ws.saved")
                : t("operator.ws.marked"),
          ),
        onError: () => toast.error(t("operator.ws.actionFailed")),
      },
    );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("operator.ws.draft")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {(dup.data?.nearDuplicates.length || dup.data?.repeats.length) && (
          <div className="flex flex-wrap gap-2">
            {(dup.data?.nearDuplicates.length ?? 0) > 0 && (
              <Badge variant="destructive">
                {t("operator.ws.duplicate")} {dup.data!.nearDuplicates.length}
              </Badge>
            )}
            {(dup.data?.repeats.length ?? 0) > 0 && (
              <Badge variant="outline">
                {t("operator.ws.repeat")} {dup.data!.repeats.length}
              </Badge>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t("operator.ws.template")}</span>
          <select className={selectCls} defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">{t("operator.ws.pickTemplate")}</option>
            {(tpls.data ?? []).map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} ({x.lang})
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1">
          <textarea
            className="h-32 w-full rounded-md border bg-background p-2"
            placeholder={t("operator.ws.draftPlaceholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigator.clipboard?.writeText(draft)}
          >
            {t("operator.ws.copy")}
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("operator.ws.service")}</span>
            <select className={selectCls} value={service} onChange={(e) => setService(e.target.value)}>
              {(meta?.services ?? []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.nameRu}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={route.isPending}
              onClick={() => act("route", { status: "routed", service })}
            >
              {t("operator.ws.route")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={route.isPending}
              onClick={() => act("draft", { text: draft })}
            >
              {t("operator.ws.saveDraft")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={route.isPending}
              onClick={() => act("mark_duplicate", {})}
            >
              {t("operator.ws.markDuplicate")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
