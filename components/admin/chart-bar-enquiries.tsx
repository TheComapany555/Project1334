"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";
import type { EnquiriesChartDataPoint } from "@/lib/chart-data";
import { CHART_BAR_HEIGHT, CHART_COLORS } from "@/lib/chart-theme";

type ChartBarEnquiriesProps = {
  data: EnquiriesChartDataPoint[];
};

export function ChartBarEnquiries({ data }: ChartBarEnquiriesProps) {
  const hasData = data.length > 0 && data.some((d) => d.enquiries > 0);
  const yMax = hasData ? Math.max(1, ...data.map((d) => d.enquiries)) : 1;

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-3 py-2">
        <CardTitle className="text-xs font-semibold">Enquiries trend</CardTitle>
        <CardDescription className="text-[10px]">Monthly over the last 6 months</CardDescription>
      </CardHeader>

      <CardContent className="px-2 pt-1.5 pb-2">
        {!hasData ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center"
            style={{ minHeight: CHART_BAR_HEIGHT }}
          >
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">No enquiry data yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_BAR_HEIGHT}>
            <BarChart data={data} margin={{ top: 8, left: -6, right: 8, bottom: 4 }}>
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
                tickMargin={6}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => (typeof v === "string" ? v.slice(0, 3) : String(v))}
              />
              <YAxis
                width={32}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                domain={[0, yMax]}
                allowDecimals={false}
                tickCount={Math.min(yMax + 1, 5)}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                  boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                }}
              />
              <Bar
                dataKey="enquiries"
                name="Enquiries"
                fill={CHART_COLORS.info}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
