import { useState } from "react";
import { useTranslation } from "@/app/i18n";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LineChartFig } from "@/components/charts/LineChartFig";
import { BarChartFig } from "@/components/charts/BarChartFig";
import { fmtInt } from "@/lib/format";
import { useNlQuery } from "./api";

const EXAMPLES = [
  "Сколько обращений по дорогам в Шымкенте за последний месяц?",
  "Топ 5 тем в Караганде за 30 дней",
  "Динамика воды в Туркестане за месяц",
  "Доля просроченных по регионам за неделю",
  "Сравни Акмолинскую и Павлодарскую по отоплению",
];

export function NlQueryTab() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const m = useNlQuery();

  const ask = (text: string): void => {
    setQ(text);
    if (text.trim()) m.mutate(text.trim());
  };

  const res = m.data;
  const rows = (res?.rows ?? []) as Record<string, number | string>[];

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
          placeholder={t("cc.query.placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" disabled={m.isPending}>
          {t("cc.query.ask")}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => ask(ex)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            {ex}
          </button>
        ))}
      </div>

      {m.isError && (
        <div className="text-sm text-destructive">
          {m.error instanceof ApiError && m.error.code === "unrecognized_query"
            ? `${m.error.message} — ${t("cc.query.examples").toLowerCase()} ↑`
            : t("common.error")}
        </div>
      )}

      {res && (
        <div className="space-y-3 rounded-md border p-4">
          {res.value !== null && (
            <div className="text-3xl font-semibold tabular-nums">{fmtInt(res.value)}</div>
          )}
          <p className="text-sm text-muted-foreground">{res.summary}</p>
          {res.chart && rows.length > 0 && res.chart.type === "line" && (
            <LineChartFig
              data={rows}
              xKey={res.chart.x}
              series={[{ key: res.chart.y, label: res.chart.y, color: "#2a78d6" }]}
            />
          )}
          {res.chart && rows.length > 0 && res.chart.type === "bar" && (
            <BarChartFig
              data={rows.map((r) => ({
                key: String(r[res.chart!.x]),
                label: String(r[res.chart!.x]),
                value: Number(r[res.chart!.y]),
              }))}
            />
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">{t("cc.query.showSql")}</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2">{res.sql}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
