import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  value: string;
  /** доля 0..1; знак → направление. Семантику «хорошо/плохо» задаёт вызывающий (Plan 4). */
  delta?: number;
  hint?: string;
  isLoading?: boolean;
}

export function KpiCard({ label, value, delta, hint, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </CardContent>
      </Card>
    );
  }

  const pct = delta === undefined ? null : Math.round(delta * 100);
  const dir = pct === null ? "flat" : pct > 0 ? "up" : pct < 0 ? "down" : "flat";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {pct !== null && (
            <span
              data-direction={dir}
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                dir === "up" && "text-destructive",
                dir === "down" && "text-emerald-600 dark:text-emerald-400",
                dir === "flat" && "text-muted-foreground",
              )}
            >
              {dir === "up" && <ArrowUpRight className="size-3.5" />}
              {dir === "down" && <ArrowDownRight className="size-3.5" />}
              {pct > 0 ? "+" : pct < 0 ? "−" : ""}
              {Math.abs(pct)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
