"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import type { ProductRevenue } from "@/lib/types/payment-analytics";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type Props = {
  data: ProductRevenue[];
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ProductRevenueChart({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.name.replace("Featured Listing – ", "").replace("Featured Listing - ", ""),
        fullName: d.name,
        revenue: d.revenue / 100,
        rawRevenue: d.revenue,
        count: d.count,
      })),
    [data]
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue by Product</CardTitle>
        <CardDescription>Revenue breakdown per package</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
            No product revenue data available for the selected period.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -4 }}>
              <CartesianGrid {...CHART_GRID} vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
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
              <ChartTooltip
                cursor={BAR_CURSOR}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0]?.payload as {
                    fullName: string;
                    rawRevenue: number;
                    count: number;
                  };
                  return (
                    <ChartTip
                      title={entry.fullName}
                      rows={[
                        {
                          color: "var(--color-revenue)",
                          label: "Revenue",
                          value: formatCurrency(entry.rawRevenue),
                        },
                        {
                          label: "Transactions",
                          value: entry.count,
                          muted: true,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={BAR_RADIUS_TOP}
                maxBarSize={BAR_MAX_SIZE}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
