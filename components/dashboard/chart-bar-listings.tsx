"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import type { ListingsChartDataPoint } from "@/lib/chart-data"
import { CHART_BAR_HEIGHT, CHART_COLORS } from "@/lib/chart-theme"

type ChartBarListingsProps = {
  data: ListingsChartDataPoint[]
  footer?: { trend?: string; description?: string }
}

export function ChartBarListings({ data, footer }: ChartBarListingsProps) {
  const hasData =
    data.length > 0 &&
    data.some((d) => d.added + d.published + d.draft + d.other > 0)

  const yMax = hasData ? Math.max(1, ...data.map((d) => d.added)) : 1

  const lastMonth = data[data.length - 1]
  const prevMonth = data[data.length - 2]
  const trendUp =
    hasData && lastMonth && prevMonth
      ? lastMonth.added >= prevMonth.added
      : null

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold">Listings over time</CardTitle>
            <CardDescription className="text-[10px]">
              Status breakdown over the last 6 months
            </CardDescription>
          </div>
          {trendUp !== null && (
            <div
              className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                trendUp
                  ? "bg-success/15 text-success dark:bg-success/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <TrendingUp className={`h-3 w-3 ${!trendUp ? "rotate-180" : ""}`} />
              {trendUp ? "Up" : "Down"}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-1.5 pb-2">
        {!hasData ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center"
            style={{ minHeight: CHART_BAR_HEIGHT }}
          >
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">No listing data yet.</p>
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
                tickFormatter={(v) =>
                  typeof v === "string" ? v.slice(0, 3) : String(v)
                }
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
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
              <Bar
                dataKey="published"
                name="Published"
                stackId="status"
                fill={CHART_COLORS.primary}
                radius={[0, 0, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="draft"
                name="Draft"
                stackId="status"
                fill={CHART_COLORS.warning}
                radius={[0, 0, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="other"
                name="Other"
                stackId="status"
                fill={CHART_COLORS.purple}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>

      {(footer?.trend || footer?.description) && (
        <div className="px-3 pb-2 pt-0.5 flex flex-col gap-0.5 border-t border-border/40">
          {footer.trend && (
            <p className="text-[10px] font-medium leading-none">{footer.trend}</p>
          )}
          {footer.description && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {footer.description}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
