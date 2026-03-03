"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type DonutSegment = {
  name: string;
  value: number;
  color: string;
};

type ChartDonutProps = {
  title: string;
  segments: DonutSegment[];
  config: ChartConfig;
};

export function ChartDonut({ title, segments, config }: ChartDonutProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-4 pb-3">
        {total === 0 ? (
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium text-foreground">No data</p>
            <p className="text-xs text-muted-foreground">Nothing to show yet.</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ChartContainer config={config} className="h-[120px] w-[120px] shrink-0">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="rounded-lg shadow-lg border-border/60"
                    />
                  }
                />
                <Pie
                  data={segments}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {segments.map((seg) => (
                    <Cell key={seg.name} fill={seg.color} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-lg font-bold"
                >
                  {total}
                </text>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-1.5 min-w-0">
              {segments.filter((s) => s.value > 0).map((seg) => (
                <div key={seg.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-muted-foreground truncate">{seg.name}</span>
                  <span className="ml-auto font-medium tabular-nums">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
