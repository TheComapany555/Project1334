"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartTip } from "@/components/ui/chart-tip";
import { CHART_GRID, CHART_TICK } from "@/lib/chart-theme";

export type OverviewDataPoint = {
  month: string;
  listings: number;
  enquiries: number;
};

const chartConfig = {
  listings: {
    label: "Listings",
    color: "var(--chart-1)",
  },
  enquiries: {
    label: "Enquiries",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartOverview({ data }: { data: OverviewDataPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity overview</CardTitle>
        <CardDescription>Listings and enquiries over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="fill-listings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-listings)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--color-listings)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fill-enquiries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-enquiries)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--color-enquiries)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={CHART_TICK}
              tickFormatter={(v: string) => v.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={CHART_TICK}
              width={36}
              allowDecimals={false}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTip
                    title={typeof label === "string" ? label : undefined}
                    rows={payload.map((p) => ({
                      color: p.color,
                      label:
                        chartConfig[p.dataKey as keyof typeof chartConfig]?.label ??
                        (p.name as string),
                      value: (p.value as number)?.toLocaleString("en-AU"),
                    }))}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="listings"
              stroke="var(--color-listings)"
              fill="url(#fill-listings)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="enquiries"
              stroke="var(--color-enquiries)"
              fill="url(#fill-enquiries)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
