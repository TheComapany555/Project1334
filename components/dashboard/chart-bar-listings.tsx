"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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
import { ChartTip } from "@/components/ui/chart-tip"
import type { ListingsChartDataPoint } from "@/lib/chart-data"
import {
  BAR_CURSOR,
  BAR_MAX_SIZE,
  BAR_RADIUS_TOP,
  CHART_BAR_HEIGHT,
  CHART_COLORS,
  CHART_GRID,
  CHART_TICK,
  SURFACE_GAP,
} from "@/lib/chart-theme"

type ChartBarListingsProps = {
  data: ListingsChartDataPoint[]
  footer?: { trend?: string; description?: string }
}

const SERIES = [
  { key: "published", name: "Published", color: CHART_COLORS.primary },
  { key: "draft", name: "Draft", color: CHART_COLORS.warning },
  { key: "other", name: "Other", color: CHART_COLORS.purple },
] as const

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
          <>
            <ResponsiveContainer width="100%" height={CHART_BAR_HEIGHT}>
              <BarChart data={data} margin={{ top: 8, left: -6, right: 8, bottom: 4 }}>
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tick={CHART_TICK}
                  tickFormatter={(v) =>
                    typeof v === "string" ? v.slice(0, 3) : String(v)
                  }
                />
                <YAxis
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  tick={CHART_TICK}
                  domain={[0, yMax]}
                  allowDecimals={false}
                  tickCount={Math.min(yMax + 1, 5)}
                />
                <Tooltip
                  cursor={BAR_CURSOR}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <ChartTip
                        title={typeof label === "string" ? label : undefined}
                        rows={payload.map((p) => ({
                          color: p.color,
                          label: p.name as string,
                          value: (p.value as number)?.toLocaleString("en-AU"),
                        }))}
                      />
                    )
                  }}
                />
                {SERIES.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stackId="status"
                    fill={s.color}
                    radius={i === SERIES.length - 1 ? BAR_RADIUS_TOP : [0, 0, 0, 0]}
                    maxBarSize={BAR_MAX_SIZE}
                    {...SURFACE_GAP}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <ChartLegendRow />
          </>
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

function ChartLegendRow() {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: s.color }}
            aria-hidden
          />
          {s.name}
        </div>
      ))}
    </div>
  )
}
