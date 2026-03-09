"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
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
import type { RevenueTimePoint } from "@/lib/types/payment-analytics";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(142, 71%, 45%)",
  },
} satisfies ChartConfig;

type Props = {
  data: RevenueTimePoint[];
};

function formatMonth(val: string): string {
  const [y, m] = val.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function RevenueChart({ data }: Props) {
  const chartData = useMemo(
    () => data.map((d) => ({ ...d, revenueDisplay: d.revenue / 100 })),
    [data]
  );

  const totalRevenue = useMemo(
    () => data.reduce((sum, d) => sum + d.revenue, 0),
    [data]
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Revenue Over Time</CardTitle>
            <CardDescription>Monthly revenue from paid transactions</CardDescription>
          </div>
          {data.length > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">Total revenue</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
            No revenue data available for the selected period.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            {chartData.length === 1 ? (
              <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={formatMonth}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  fontSize={11}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const val = payload[0]?.value as number;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-medium mb-1">{formatMonth(label)}</p>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="ml-auto font-semibold tabular-nums">
                            {formatCurrency(val * 100)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="revenueDisplay"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={formatMonth}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  fontSize={11}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const val = payload[0]?.value as number;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-medium mb-1">{formatMonth(label)}</p>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="ml-auto font-semibold tabular-nums">
                            {formatCurrency(val * 100)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenueDisplay"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-revenue)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
