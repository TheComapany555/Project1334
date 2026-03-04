"use client";

import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHART_DONUT_HEIGHT, CHART_DONUT_SIZE } from "@/lib/chart-theme";

export type DonutSegment = {
  name: string;
  value: number;
  color: string;
};

type ChartDonutProps = {
  title: string;
  segments: DonutSegment[];
  config?: unknown;
};

export function ChartDonut({ title, segments }: ChartDonutProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = CHART_DONUT_SIZE;
  const innerR = size * 0.35;
  const outerR = size * 0.48;

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-3 py-2">
        <CardTitle className="text-xs font-semibold">{title}</CardTitle>
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
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 11,
                      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                    }}
                  />
                  <Pie
                    data={segments}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerR}
                    outerRadius={outerR}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {segments.map((seg) => (
                      <Cell key={seg.name} fill={seg.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <span
                className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground pointer-events-none"
                aria-hidden
              >
                {total}
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {segments
                .filter((s) => s.value > 0)
                .map((seg) => (
                  <div
                    key={seg.name}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate max-w-[120px]">{seg.name}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {seg.value}
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
