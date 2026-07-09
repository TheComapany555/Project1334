"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
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
import { SURFACE_GAP, chartColor } from "@/lib/chart-theme";
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
  colors?: Record<string, string>;
  /** Override center label (e.g. "Subscriptions"). */
  totalLabel?: string;
  /** When true, show amount (cents) as the value instead of count. */
  showAmount?: boolean;
  /** Implicit when showAmount=true. Otherwise format as count. */
  valueKind?: ValueKind;
  className?: string;
  height?: number;
};

function formatValue(n: number, kind: ValueKind): string {
  if (kind === "currency") return formatCurrencyAUD(n);
  return n.toLocaleString("en-AU");
}

export function DonutChart({
  title,
  description,
  data,
  colors,
  totalLabel = "Total",
  showAmount,
  valueKind,
  className,
  height = 220,
}: Props) {
  const kind: ValueKind = valueKind ?? (showAmount ? "currency" : "count");

  const config = data.reduce<ChartConfig>((acc, seg, i) => {
    acc[seg.key] = {
      label: seg.label,
      color: colors?.[seg.key] ?? chartColor(i),
    };
    return acc;
  }, {} as ChartConfig);

  const chartData = data.map((d, i) => ({
    name: d.label,
    value: showAmount ? (d.amount ?? 0) : d.count,
    fill: colors?.[d.key] ?? chartColor(i),
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;

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
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,140px)] gap-4 items-center">
            <div className="relative" style={{ height }}>
              <ChartContainer config={config} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]?.payload as {
                          name: string;
                          value: number;
                          fill: string;
                        };
                        const pct = total > 0 ? (p.value / total) * 100 : 0;
                        return (
                          <ChartTip
                            rows={[
                              {
                                color: p.fill,
                                label: p.name,
                                value: `${formatValue(p.value, kind)} · ${pct.toFixed(1)}%`,
                              },
                            ]}
                          />
                        );
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius="58%"
                      outerRadius="85%"
                      paddingAngle={1}
                      {...SURFACE_GAP}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-semibold tabular-nums">
                  {formatValue(total, kind)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {totalLabel}
                </span>
              </div>
            </div>

            <ul className="space-y-1.5">
              {data.map((seg, i) => {
                const v = showAmount ? (seg.amount ?? 0) : seg.count;
                const pct = total > 0 ? (v / total) * 100 : 0;
                return (
                  <li
                    key={seg.key}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-2 w-2 rounded-[2px] shrink-0"
                      style={{ backgroundColor: colors?.[seg.key] ?? chartColor(i) }}
                      aria-hidden
                    />
                    <span className="text-foreground truncate">{seg.label}</span>
                    <span className="ml-auto tabular-nums font-medium">
                      {formatValue(v, kind)}
                    </span>
                    <span className="tabular-nums text-muted-foreground w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
