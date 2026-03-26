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
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type OverviewDataPoint = {
  month: string;
  listings: number;
  enquiries: number;
};

const chartConfig = {
  listings: {
    label: "Listings",
    color: "var(--primary)",
  },
  enquiries: {
    label: "Enquiries",
    color: "var(--chart-4)",
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
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.slice(0, 3)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="listings"
              stroke="var(--color-listings)"
              fill="var(--color-listings)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="enquiries"
              stroke="var(--color-enquiries)"
              fill="var(--color-enquiries)"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
