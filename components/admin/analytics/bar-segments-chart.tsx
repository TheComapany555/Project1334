"use client";

import {
  Bar,
  BarChart,
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
  /** Per-bar colors keyed by segment.key. Falls back to palette. */
  colors?: Record<string, string>;
  className?: string;
  height?: number;
};

const PALETTE = [
  "var(--primary)",
  "hsl(189, 94%, 43%)",
  "hsl(45, 100%, 51%)",
  "hsl(258, 90%, 66%)",
  "hsl(340, 82%, 52%)",
  "hsl(160, 84%, 39%)",
];

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
      color: colors?.[seg.key] ?? PALETTE[i % PALETTE.length],
    };
    return acc;
  }, {} as ChartConfig);

  const chartData = data.map((d, i) => ({
    label: d.label,
    value: showAmount ? (d.amount ?? 0) : d.count,
    fill: colors?.[d.key] ?? PALETTE[i % PALETTE.length],
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
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  fontSize={12}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    const v = item?.value as number;
                    const label = (item?.payload as { label?: string })?.label;
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
                        <p className="font-medium mb-1">{label}</p>
                        <p className="tabular-nums font-semibold">
                          {formatValue(v, kind)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
