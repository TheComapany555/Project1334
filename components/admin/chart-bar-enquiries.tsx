"use client";

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
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Mail } from "lucide-react";
import type { EnquiriesChartDataPoint } from "@/lib/chart-data";

const chartConfig = {
  enquiries: {
    label: "Enquiries",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type ChartBarEnquiriesProps = {
  data: EnquiriesChartDataPoint[];
};

export function ChartBarEnquiries({ data }: ChartBarEnquiriesProps) {
  const hasData =
    data.length > 0 && data.some((d) => d.enquiries > 0);
  const yMax = hasData
    ? Math.max(1, ...data.map((d) => d.enquiries))
    : 1;

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-3">
        <div>
          <CardTitle className="text-sm">Enquiries trend</CardTitle>
          <CardDescription className="mt-0.5 text-xs">
            Monthly enquiries — last 6 months
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-3 pt-3 pb-1">
        {!hasData ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 text-center">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enquiry data will appear here.
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[120px] w-full">
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 8, left: 0, right: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
                  typeof v === "string" ? v.slice(0, 3) : String(v)
                }
              />
              <YAxis
                width={28}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                domain={[0, yMax]}
                allowDecimals={false}
                tickCount={Math.min(yMax + 1, 5)}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                content={
                  <ChartTooltipContent
                    className="rounded-lg shadow-lg border-border/60"
                  />
                }
              />
              <Bar
                dataKey="enquiries"
                fill="var(--color-enquiries)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
