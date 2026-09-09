import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_STYLE,
  clampLabel,
  compactNumber,
  DEFAULT_SERIES,
  fullNumber,
  GRID_STYLE,
  TOOLTIP_WRAPPER_CLS,
} from "./chartTheme";

interface Datum {
  key: string;
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: Datum[];
  height?: number;
  horizontal?: boolean;
  onBarClick?: (key: string) => void;
}

export function BarChartFig({ data, height = 260, horizontal = false, onBarClick }: Props) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, bottom: horizontal ? 4 : 44, left: horizontal ? 8 : 4 }}
        barCategoryGap={horizontal ? "20%" : "24%"}
      >
        <CartesianGrid {...GRID_STYLE} horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={compactNumber} {...AXIS_STYLE} />
            <YAxis
              type="category"
              dataKey="label"
              width={168}
              tickFormatter={(v: string) => clampLabel(v, 24)}
              {...AXIS_STYLE}
            />
          </>
        ) : (
          <>
            <XAxis
              type="category"
              dataKey="label"
              interval={0}
              angle={-32}
              textAnchor="end"
              height={56}
              tickFormatter={(v: string) => clampLabel(v, 16)}
              {...AXIS_STYLE}
            />
            <YAxis type="number" width={48} tickFormatter={compactNumber} {...AXIS_STYLE} />
          </>
        )}
        <Tooltip
          wrapperClassName={TOOLTIP_WRAPPER_CLS}
          cursor={{ fill: "hsl(var(--muted))" }}
          formatter={(v: number) => [fullNumber(v), ""]}
        />
        <Bar
          dataKey="value"
          maxBarSize={horizontal ? 22 : 48}
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          isAnimationActive={false}
          onClick={(d: unknown) => onBarClick?.((d as { payload: Datum }).payload.key)}
          cursor={onBarClick ? "pointer" : undefined}
        >
          {data.map((d, i) => (
            <Cell key={d.key} fill={d.color ?? DEFAULT_SERIES[i % DEFAULT_SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
