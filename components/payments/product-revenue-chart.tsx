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
import type { ProductRevenue } from "@/lib/types/payment-analytics";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(199, 89%, 48%)",
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
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
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
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                      <p className="font-medium mb-1">{entry.fullName}</p>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "hsl(199, 89%, 48%)" }} />
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="ml-auto font-semibold tabular-nums">
                            {formatCurrency(entry.rawRevenue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full opacity-0" />
                          <span className="text-muted-foreground">Transactions</span>
                          <span className="ml-auto font-semibold tabular-nums">{entry.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
