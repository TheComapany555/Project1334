"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Label } from "recharts";
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
import type { StatusDistribution } from "@/lib/types/payment-analytics";

const STATUS_COLORS: Record<string, string> = {
  paid: "hsl(142, 71%, 45%)",
  pending: "hsl(38, 92%, 50%)",
  invoiced: "hsl(262, 83%, 58%)",
  approved: "hsl(199, 89%, 48%)",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  invoiced: "Invoiced",
  approved: "Approved",
};

type Props = {
  data: StatusDistribution[];
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function StatusDistributionChart({ data }: Props) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const d of data) {
      config[d.status] = {
        label: STATUS_LABELS[d.status] ?? d.status,
        color: STATUS_COLORS[d.status] ?? "hsl(var(--muted-foreground))",
      };
    }
    return config;
  }, [data]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Payment Status</CardTitle>
        <CardDescription>Distribution by status</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
            No payment data available for the selected period.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <PieChart>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0];
                    const statusKey = entry?.payload?.status as string;
                    const count = entry?.value as number;
                    const amount = entry?.payload?.amount as number;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-medium mb-1">
                          {STATUS_LABELS[statusKey] ?? statusKey}
                        </p>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: STATUS_COLORS[statusKey] }}
                            />
                            <span className="text-muted-foreground">Count</span>
                            <span className="ml-auto font-semibold tabular-nums">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full opacity-0" />
                            <span className="text-muted-foreground">Amount</span>
                            <span className="ml-auto font-semibold tabular-nums">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted-foreground))"}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                              {total}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-[10px]">
                              Total
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {data.map((d) => (
                <div key={d.status} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[d.status] }}
                  />
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                  <span className="font-medium tabular-nums">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
