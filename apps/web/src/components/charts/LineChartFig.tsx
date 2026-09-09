import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_STYLE,
  compactNumber,
  fullNumber,
  GRID_STYLE,
  shortDate,
  TOOLTIP_WRAPPER_CLS,
} from "./chartTheme";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

interface Props {
  data: Record<string, number | string>[];
  xKey: string;
  series: LineSeries[];
  band?: { lowerKey: string; upperKey: string; color: string };
  height?: number;
  yLabel?: string;
}

export function LineChartFig({ data, xKey, series, band, height = 260, yLabel }: Props) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={shortDate}
          minTickGap={28}
          {...AXIS_STYLE}
        />
        <YAxis
          {...AXIS_STYLE}
          width={48}
          tickFormatter={compactNumber}
          label={
            yLabel
              ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 11 }
              : undefined
          }
        />
        <Tooltip
          wrapperClassName={TOOLTIP_WRAPPER_CLS}
          labelFormatter={(l: string) => l}
          formatter={(v: number, name: string) => [fullNumber(v), name]}
        />
        {series.length >= 2 && <Legend iconType="plainline" />}
        {band && (
          <>
            <Area
              type="monotone"
              dataKey={band.upperKey}
              stroke="none"
              fill={band.color}
              fillOpacity={0.15}
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey={band.lowerKey}
              stroke="none"
              fill="hsl(var(--card))"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
          </>
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
