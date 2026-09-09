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
import { AXIS_STYLE, DEFAULT_SERIES, GRID_STYLE, TOOLTIP_WRAPPER_CLS } from "./chartTheme";

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
        margin={{ top: 8, right: 12, bottom: 4, left: horizontal ? 8 : 4 }}
      >
        <CartesianGrid {...GRID_STYLE} horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS_STYLE} />
            <YAxis type="category" dataKey="label" width={140} {...AXIS_STYLE} />
          </>
        ) : (
          <>
            <XAxis type="category" dataKey="label" {...AXIS_STYLE} interval={0} />
            <YAxis type="number" width={44} {...AXIS_STYLE} />
          </>
        )}
        <Tooltip wrapperClassName={TOOLTIP_WRAPPER_CLS} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar
          dataKey="value"
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          isAnimationActive={false}
          onClick={(d: unknown) =>
            onBarClick?.((d as { payload: Datum }).payload.key)
          }
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
