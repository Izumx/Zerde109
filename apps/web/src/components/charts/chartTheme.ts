import { useTheme } from "@/app/theme";
import { useMeta } from "@/lib/useMeta";

/**
 * Валидированная категориальная палитра (dataviz skill, reference instance).
 * Прогнано `validate_palette.js`:
 *  light: adjacent CVD ΔE 9.1 (≥8), normal-vision 19.6 (≥15). 3 слота < 3:1
 *         контраста → relief: используем direct labels / table view (ChartCard).
 *  dark:  adjacent CVD ΔE 8.4, normal-vision 19.3, все ≥ 3:1.
 * Порядок фиксирован, не циклится: 9-й ключ → последний цвет + предупреждение.
 */
const LIGHT = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948",
] as const;
const DARK = [
  "#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767",
] as const;

export const DEFAULT_SERIES: readonly string[] = LIGHT;

/** Ненавязчивые оси/сетка из токенов темы. */
export const AXIS_STYLE = {
  stroke: "hsl(var(--border))",
  fontSize: 11,
  tickLine: false,
} as const;
export const GRID_STYLE = { stroke: "hsl(var(--border))", strokeDasharray: "3 3" } as const;
export const TOOLTIP_WRAPPER_CLS =
  "rounded-md border bg-card px-2.5 py-1.5 text-xs text-card-foreground shadow-sm";

/**
 * Возвращает функцию `keys -> {key: hex}`. Коды тем берут `themes.color` из meta;
 * прочие ключи (регионы/статусы/каналы) — по порядку из палитры под текущую тему.
 */
export function useSeriesColors(): (keys: string[]) => Record<string, string> {
  const { resolved } = useTheme();
  const { data } = useMeta();
  const ramp = resolved === "dark" ? DARK : LIGHT;
  const themeColor = new Map<string, string>((data?.themes ?? []).map((t) => [t.code, t.color]));

  return (keys: string[]) => {
    const out: Record<string, string> = {};
    let slot = 0;
    for (const k of keys) {
      const themed = themeColor.get(k);
      if (themed) {
        out[k] = themed;
        continue;
      }
      if (slot >= ramp.length) {
        if (import.meta.env.DEV) console.warn(`useSeriesColors: >${ramp.length} series, reusing last colour for "${k}"`);
        out[k] = ramp[ramp.length - 1]!;
      } else {
        out[k] = ramp[slot]!;
        slot += 1;
      }
    }
    return out;
  };
}
