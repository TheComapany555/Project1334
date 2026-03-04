"use client";

import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
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
import { CHART_COLORS, CHART_DONUT_HEIGHT, CHART_DONUT_SIZE } from "@/lib/chart-theme";

const COLORS = {
  brokers: CHART_COLORS.primary,
  listings: CHART_COLORS.info,
  enquiries: CHART_COLORS.warning,
  categories: CHART_COLORS.purple,
};

type ChartRadialOverviewProps = {
  brokers: number;
  listings: number;
  enquiries: number;
  categories: number;
};

export function ChartRadialOverview({
  brokers,
  listings,
  enquiries,
  categories,
}: ChartRadialOverviewProps) {
  const total = brokers + listings + enquiries + categories;
  const maxValue = Math.max(brokers, listings, enquiries, categories, 1);

  const data = [
    { name: "Brokers", value: brokers, fill: COLORS.brokers },
    { name: "Listings", value: listings, fill: COLORS.listings },
    { name: "Enquiries", value: enquiries, fill: COLORS.enquiries },
    { name: "Categories", value: categories, fill: COLORS.categories },
  ];

  const size = CHART_DONUT_SIZE;
  const innerR = size * 0.18;
  const outerR = size * 0.48;
  const barSize = (outerR - innerR) / 4;

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-3 py-2">
        <CardTitle className="text-xs font-semibold">Platform overview</CardTitle>
        <CardDescription className="text-[10px]">
          Current totals across the platform
        </CardDescription>
      </CardHeader>

      <CardContent className="px-3 py-4">
        {total === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-1 text-center"
            style={{ minHeight: CHART_DONUT_HEIGHT }}
          >
            <p className="text-xs font-medium text-foreground">No data</p>
            <p className="text-[10px] text-muted-foreground">Nothing to show yet.</p>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4"
            style={{ minHeight: CHART_DONUT_HEIGHT }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: size, height: size }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius={innerR}
                  outerRadius={outerR}
                  barSize={barSize}
                  data={data}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, maxValue]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 11,
                      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                    }}
                  />
                  <RadialBar
                    dataKey="value"
                    background={{ fill: "var(--muted)", opacity: 0.3 }}
                    cornerRadius={4}
                    angleAxisId={0}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <span
                className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground pointer-events-none"
                aria-hidden
              >
                {total}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="truncate max-w-[80px]">{item.name}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
