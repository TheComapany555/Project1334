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
      color: colors?.[seg.key] ?? PALETTE[i % PALETTE.length],
    };
    return acc;
  }, {} as ChartConfig);

  const chartData = data.map((d, i) => ({
    name: d.label,
    value: showAmount ? (d.amount ?? 0) : d.count,
    fill: colors?.[d.key] ?? PALETTE[i % PALETTE.length],
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
                          <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-lg space-y-1">
                            <p className="font-medium">{p.name}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: p.fill }}
                              />
                              <span className="tabular-nums font-semibold">
                                {formatValue(p.value, kind)}
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                ({pct.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius="58%"
                      outerRadius="85%"
                      strokeWidth={2}
                      stroke="var(--background)"
                      paddingAngle={1}
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
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        background:
                          colors?.[seg.key] ?? PALETTE[i % PALETTE.length],
                      }}
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
