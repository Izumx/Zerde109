import { useState, type ReactNode } from "react";
import { useTranslation } from "@/app/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

interface Props {
  title: string;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  /** таблица-эквивалент графика; включает тумблер «Показать таблицей» */
  tableSlot?: ReactNode;
  children: ReactNode;
}

export function ChartCard({
  title,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  tableSlot,
  children,
}: Props) {
  const { t } = useTranslation();
  const [asTable, setAsTable] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {tableSlot && !isLoading && !isError && !isEmpty && (
          <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)}>
            {asTable ? t("common.showChart") : t("common.showTable")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <span>{t("common.error")}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t("common.retry")}
              </Button>
            )}
          </div>
        ) : isEmpty ? (
          <EmptyState />
        ) : asTable && tableSlot ? (
          <div className="overflow-x-auto">{tableSlot}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
