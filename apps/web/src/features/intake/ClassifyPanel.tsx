import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/app/i18n";
import { useMeta } from "@/lib/useMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtPct } from "@/lib/format";
import { useClassify } from "./api";

const SAMPLES = [
  "Көшеде жарық жоқ, үшінші күн қатарынан. Мекенжай: Абай көшесі 12.",
  "Прорыв трубы, нет холодной воды в доме по ул. Абая 5, второй подъезд.",
  "Не работает светофор на перекрёстке Достык — Гоголя.",
  "Су жоқ, батареялар суық, жылу берілмейді.",
  "Мусор не вывозят неделю, контейнеры переполнены во дворе.",
];

export function ClassifyPanel() {
  const { t } = useTranslation();
  const meta = useMeta().data;
  const [text, setText] = useState("");
  const m = useClassify();
  const r = m.data;

  const themeLabel = (c: string): string => meta?.themes.find((x) => x.code === c)?.nameRu ?? c;
  const serviceLabel = (c: string): string => meta?.services.find((x) => x.code === c)?.nameRu ?? c;
  const themeColor = (c: string): string | undefined =>
    meta?.themes.find((x) => x.code === c)?.color;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">{t("intake.classify.input")}</label>
        <textarea
          className="h-40 w-full rounded-md border bg-background p-3 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <Button disabled={!text.trim() || m.isPending} onClick={() => m.mutate({ text: text.trim() })}>
            {t("intake.classify.run")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setText(SAMPLES[Math.floor(Math.random() * SAMPLES.length)]!)}
          >
            {t("intake.classify.sample")}
          </Button>
        </div>
        {m.isError && <p className="text-sm text-destructive">{t("common.error")}</p>}
      </div>

      {r && (
        <div className="space-y-4 rounded-md border p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge style={{ background: themeColor(r.theme), color: "#fff" }}>
              {themeLabel(r.theme)}
            </Badge>
            <Badge variant="outline">{r.priority}</Badge>
            <Badge variant="secondary">{r.language}</Badge>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{t("intake.classify.route")}:</span>
            <span>обращение</span>
            <ArrowRight className="size-3.5" />
            <span className="font-medium text-foreground">{serviceLabel(r.service)}</span>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("intake.classify.confidence")}</span>
              <span>{fmtPct(r.confidence)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-muted">
              <div className="h-full rounded bg-primary" style={{ width: fmtPct(r.confidence) }} />
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              {t("intake.classify.entities")}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">{t("intake.classify.address")}</dt>
              <dd>{r.entities.address ?? "—"}</dd>
              <dt className="text-muted-foreground">{t("intake.classify.object")}</dt>
              <dd>{r.entities.object ?? "—"}</dd>
              <dt className="text-muted-foreground">{t("intake.classify.problem")}</dt>
              <dd>{r.entities.problem ?? "—"}</dd>
            </dl>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">{t("intake.classify.json")}</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2">
              {JSON.stringify(r, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
