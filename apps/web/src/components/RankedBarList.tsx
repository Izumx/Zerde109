import { cn } from "@/lib/cn";
import { fmtInt } from "@/lib/format";

export interface RankedItem {
  key: string;
  label: string;
  value: number;
  color?: string;
}

interface Props {
  items: RankedItem[];
  max?: number;
  onItemClick?: (key: string) => void;
}

/** Горизонтальные полоски-ранги (div-based). Цвет несёт идентичность, текст — токены. */
export function RankedBarList({ items, max, onItemClick }: Props) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const pct = Math.max(2, Math.round((it.value / top) * 100));
        return (
          <li key={it.key}>
            <button
              type="button"
              disabled={!onItemClick}
              onClick={() => onItemClick?.(it.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded px-1 py-1 text-left text-sm",
                onItemClick && "hover:bg-accent",
              )}
            >
              <span className="w-40 shrink-0 truncate text-foreground">{it.label}</span>
              <span className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${pct}%`, background: it.color ?? "hsl(var(--primary))" }}
                />
              </span>
              <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">
                {fmtInt(it.value)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
