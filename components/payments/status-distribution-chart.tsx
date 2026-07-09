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
import { ChartTip } from "@/components/ui/chart-tip";
import { CHART_COLORS, SURFACE_GAP } from "@/lib/chart-theme";
import type { StatusDistribution } from "@/lib/types/payment-analytics";

const STATUS_COLORS: Record<string, string> = {
  paid: CHART_COLORS.primary, // green
  pending: CHART_COLORS.warning, // amber
  invoiced: CHART_COLORS.purple, // violet
  approved: CHART_COLORS.info, // blue
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  invoiced: "Invoiced",
  approved: "Approved",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? CHART_COLORS.muted;
}

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
        color: statusColor(d.status),
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
                      <ChartTip
                        title={STATUS_LABELS[statusKey] ?? statusKey}
                        rows={[
                          {
                            color: statusColor(statusKey),
                            label: "Count",
                            value: `${count} (${pct}%)`,
                          },
                          {
                            label: "Amount",
                            value: formatCurrency(amount),
                            muted: true,
                          },
                        ]}
                      />
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
                  {...SURFACE_GAP}
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={statusColor(entry.status)} />
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
                    className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                    style={{ backgroundColor: statusColor(d.status) }}
                    aria-hidden
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
