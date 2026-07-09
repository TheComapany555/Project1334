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
import { ChartTip } from "@/components/ui/chart-tip";
import {
  BAR_CURSOR,
  BAR_MAX_SIZE,
  BAR_RADIUS_TOP,
  CHART_GRID,
  CHART_TICK,
} from "@/lib/chart-theme";
import type { RevenueTimePoint } from "@/lib/types/payment-analytics";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
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

function revenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value as number;
  return (
    <ChartTip
      title={formatMonth(label ?? "")}
      rows={[
        {
          color: "var(--color-revenue)",
          label: "Revenue",
          value: formatCurrency(val * 100),
        },
      ]}
    />
  );
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
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={formatMonth}
                  tick={CHART_TICK}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  tick={CHART_TICK}
                />
                <ChartTooltip cursor={BAR_CURSOR} content={revenueTooltip} />
                <Bar
                  dataKey="revenueDisplay"
                  fill="var(--color-revenue)"
                  radius={BAR_RADIUS_TOP}
                  maxBarSize={BAR_MAX_SIZE}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -4 }}>
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={formatMonth}
                  tick={CHART_TICK}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  tick={CHART_TICK}
                />
                <ChartTooltip content={revenueTooltip} />
                <Line
                  type="monotone"
                  dataKey="revenueDisplay"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-revenue)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
