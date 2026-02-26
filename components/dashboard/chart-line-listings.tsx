"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

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
    color: "var(--chart-2)",
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
  const hasData = data.length > 0 && data.some((d) => d.added + d.published + d.draft + d.other > 0)

  const yMax = hasData
    ? Math.max(1, ...data.flatMap((d) => [d.added, d.published, d.draft, d.other]))
    : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listings over time</CardTitle>
        <CardDescription>
          New listings added and status breakdown by month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
            No listing data for the last 6 months yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
            <LineChart
              accessibilityLayer
              data={data}
              margin={{
                top: 16,
                left: 24,
                right: 16,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => (typeof value === "string" ? value.slice(0, 3) : String(value))}
              />
              <YAxis
                width={28}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, yMax]}
                allowDecimals={false}
                tickCount={Math.min(yMax + 1, 6)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Line
                dataKey="added"
                type="monotone"
                stroke="var(--color-added)"
                strokeWidth={2}
                dot={{ fill: "var(--color-added)", r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                dataKey="published"
                type="monotone"
                stroke="var(--color-published)"
                strokeWidth={2}
                dot={{ fill: "var(--color-published)", r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                dataKey="draft"
                type="monotone"
                stroke="var(--color-draft)"
                strokeWidth={2}
                dot={{ fill: "var(--color-draft)", r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                dataKey="other"
                type="monotone"
                stroke="var(--color-other)"
                strokeWidth={2}
                dot={{ fill: "var(--color-other)", r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      {(footer?.trend || footer?.description) && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {footer.trend && (
            <div className="leading-none font-medium">{footer.trend}</div>
          )}
          {footer.description && (
            <div className="text-muted-foreground leading-none">
              {footer.description}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
