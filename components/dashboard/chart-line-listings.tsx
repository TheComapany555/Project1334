"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { TrendingUp } from "lucide-react"

export type ListingsChartDataPoint = {
  month: string
  added: number
  published: number
  draft: number
  other: number
}

const chartConfig = {
  added: {
    label: "Added",
    color: "var(--chart-1)",
  },
  published: {
    label: "Published",
    color: "#1a5c38",
  },
  draft: {
    label: "Draft",
    color: "var(--chart-3)",
  },
  other: {
    label: "Other",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

type ChartLineListingsProps = {
  data: ListingsChartDataPoint[]
  footer?: { trend?: string; description?: string }
}

export function ChartLineListings({ data, footer }: ChartLineListingsProps) {
  const hasData =
    data.length > 0 &&
    data.some((d) => d.added + d.published + d.draft + d.other > 0)

  const yMax = hasData
    ? Math.max(1, ...data.flatMap((d) => [d.added, d.published, d.draft, d.other]))
    : 1

  // Compute total added in last month vs previous for trend
  const lastMonth = data[data.length - 1]
  const prevMonth = data[data.length - 2]
  const trendUp =
    hasData && lastMonth && prevMonth
      ? lastMonth.added >= prevMonth.added
      : null

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Listings over time</CardTitle>
            <CardDescription className="mt-0.5">
              New listings added and status breakdown — last 6 months
            </CardDescription>
          </div>
          {trendUp !== null && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                trendUp
                  ? "bg-[#1a5c38]/10 text-[#1a5c38] dark:bg-[#4ade80]/10 dark:text-[#4ade80]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <TrendingUp className={`h-3.5 w-3.5 ${!trendUp ? "rotate-180" : ""}`} />
              {trendUp ? "Up" : "Down"} this month
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pt-5 pb-2">
        {!hasData ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Listing activity will appear here once you create listings.
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
              <ChartLegend content={<ChartLegendContent className="text-xs mt-2" />} />
              {(["added", "published", "draft", "other"] as const).map((key) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={{ fill: `var(--color-${key})`, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>

      {(footer?.trend || footer?.description) && (
        <div className="px-5 pb-4 pt-1 flex flex-col gap-1 border-t border-border/40 mt-2">
          {footer.trend && (
            <p className="text-sm font-medium leading-none">{footer.trend}</p>
          )}
          {footer.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {footer.description}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}