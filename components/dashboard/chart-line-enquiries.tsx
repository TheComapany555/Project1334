"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type ChartLineEnquiriesProps = {
  data: EnquiriesChartDataPoint[];
  footer?: { description?: string };
};

export function ChartLineEnquiries({ data, footer }: ChartLineEnquiriesProps) {
  const hasData =
    data.length > 0 && data.some((d) => d.enquiries > 0);
  const yMax = hasData
    ? Math.max(1, ...data.map((d) => d.enquiries))
    : 1;

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4">
        <div>
          <CardTitle className="text-base">Enquiries over time</CardTitle>
          <CardDescription className="mt-0.5">
            Enquiries received in the last 6 months
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-5 pt-5 pb-2">
        {!hasData ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enquiry activity will appear here when buyers contact you.
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ top: 12, left: 0, right: 16, bottom: 0 }}
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
                tickMargin={10}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
                  typeof v === "string" ? v.slice(0, 3) : String(v)
                }
              />
              <YAxis
                width={30}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                domain={[0, yMax]}
                allowDecimals={false}
                tickCount={Math.min(yMax + 1, 6)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    className="rounded-xl shadow-lg border-border/60"
                  />
                }
              />
              <Line
                dataKey="enquiries"
                type="monotone"
                stroke="var(--color-enquiries)"
                strokeWidth={2}
                dot={{ fill: "var(--color-enquiries)", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>

      {footer?.description && (
        <div className="px-5 pb-4 pt-1 flex flex-col gap-1 border-t border-border/40 mt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {footer.description}
          </p>
        </div>
      )}
    </Card>
  );
}
