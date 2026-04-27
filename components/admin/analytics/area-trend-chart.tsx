"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
import {
  formatCompactNumber,
  formatCurrencyAUD,
  formatMonthShort,
} from "@/lib/utils/format";

type DataPoint = {
  month: string;
  value: number;
};

/**
 * "count" — value is a plain integer (e.g. 12 enquiries)
 * "currency" — value is in cents (e.g. 12000 = $120)
 */
type ValueKind = "count" | "currency";

type Props = {
  title: string;
  description?: string;
  data: DataPoint[];
  /** Right-aligned big number above the chart, e.g. total revenue. */
  headlineValue?: string;
  headlineLabel?: string;
  /** CSS color or token; defaults to primary. */
  color?: string;
  /** Series label shown in tooltip. */
  seriesLabel?: string;
  /** How to format the value on the y-axis and in the tooltip. */
  valueKind?: ValueKind;
  className?: string;
  height?: number;
};

function formatYAxis(n: number, kind: ValueKind): string {
  if (kind === "currency") return `$${formatCompactNumber(n / 100)}`;
  return formatCompactNumber(n);
}

function formatTooltip(n: number, kind: ValueKind, label: string): string {
  if (kind === "currency") return formatCurrencyAUD(n);
  // For counts, append the lowercased series label (so "12 enquiries").
  return `${n.toLocaleString("en-AU")} ${label.toLowerCase()}`;
}

export function AreaTrendChart({
  title,
  description,
  data,
  headlineValue,
  headlineLabel,
  color = "var(--primary)",
  seriesLabel = "Value",
  valueKind = "count",
  className,
  height = 240,
}: Props) {
  const chartConfig = {
    value: { label: seriesLabel, color },
  } satisfies ChartConfig;

  const empty = data.every((d) => d.value === 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
          {headlineValue && (
            <div className="text-right">
              <p className="text-base font-semibold tabular-nums">
                {headlineValue}
              </p>
              {headlineLabel && (
                <p className="text-[10px] text-muted-foreground">
                  {headlineLabel}
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {empty ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md"
            style={{ height }}
          >
            No data yet for this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
              >
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-value)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-value)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthShort}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(n: number) => formatYAxis(n, valueKind)}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  width={48}
                  fontSize={11}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const v = payload[0]?.value as number;
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
                        <p className="font-medium mb-1">
                          {formatMonthShort(label as string)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: "var(--color-value)" }}
                          />
                          <span className="text-muted-foreground">
                            {seriesLabel}
                          </span>
                          <span className="ml-auto font-semibold tabular-nums">
                            {formatTooltip(v, valueKind, seriesLabel)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  fill="url(#areaFill)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
