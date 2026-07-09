"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartTip } from "@/components/ui/chart-tip";
import {
  BAR_MAX_SIZE,
  BAR_RADIUS_RIGHT,
  CHART_GRID,
  CHART_TICK,
  chartColor,
} from "@/lib/chart-theme";
import { formatCurrencyAUD } from "@/lib/utils/format";

type Segment = {
  key: string;
  label: string;
  count: number;
  amount?: number;
};

type ValueKind = "count" | "currency";

type Props = {
  title: string;
  description?: string;
  data: Segment[];
  /** Show "amount" (cents) values instead of counts. */
  showAmount?: boolean;
  /** Implicit when showAmount=true. Otherwise format as count. */
  valueKind?: ValueKind;
  /** Per-bar colors keyed by segment.key. Falls back to the categorical palette. */
  colors?: Record<string, string>;
  className?: string;
  height?: number;
};

function formatValue(n: number, kind: ValueKind): string {
  if (kind === "currency") return formatCurrencyAUD(n);
  return n.toLocaleString("en-AU");
}

export function BarSegmentsChart({
  title,
  description,
  data,
  showAmount,
  valueKind,
  colors,
  className,
  height = 240,
}: Props) {
  const kind: ValueKind = valueKind ?? (showAmount ? "currency" : "count");

  const chartConfig = data.reduce<ChartConfig>((acc, seg, i) => {
    acc[seg.key] = {
      label: seg.label,
      color: colors?.[seg.key] ?? chartColor(i),
    };
    return acc;
  }, {} as ChartConfig);

  const chartData = data.map((d, i) => ({
    label: d.label,
    value: showAmount ? (d.amount ?? 0) : d.count,
    fill: colors?.[d.key] ?? chartColor(i),
  }));

  const empty = chartData.every((d) => d.value === 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {empty ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md"
            style={{ height }}
          >
            No data yet
          </div>
        ) : (
          <ChartContainer config={chartConfig} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
              >
                <CartesianGrid {...CHART_GRID} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  tick={CHART_TICK}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    const v = item?.value as number;
                    const row = item?.payload as { label?: string; fill?: string };
                    return (
                      <ChartTip
                        title={row?.label}
                        rows={[
                          {
                            color: row?.fill,
                            label: showAmount ? "Amount" : "Count",
                            value: formatValue(v, kind),
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={BAR_RADIUS_RIGHT}
                  maxBarSize={BAR_MAX_SIZE}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
