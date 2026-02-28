"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminStats } from "@/lib/actions/admin-stats";

const chartConfig = {
  brokersActive: {
    label: "Active",
    color: "var(--success)",
  },
  brokersPending: {
    label: "Pending",
    color: "var(--warning)",
  },
  brokersDisabled: {
    label: "Disabled",
    color: "var(--muted-foreground)",
  },
  listingsPublished: {
    label: "Published",
    color: "var(--success)",
  },
  listingsDraft: {
    label: "Draft",
    color: "var(--warning)",
  },
  listingsRemoved: {
    label: "Removed",
    color: "var(--destructive)",
  },
  enquiriesOlder: {
    label: "Older",
    color: "var(--muted-foreground)",
  },
  enquiriesLast7Days: {
    label: "Last 7 days",
    color: "var(--primary)",
  },
  categoriesActive: {
    label: "Active",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type OverviewDataPoint = {
  name: string;
  brokersActive: number;
  brokersPending: number;
  brokersDisabled: number;
  listingsPublished: number;
  listingsDraft: number;
  listingsRemoved: number;
  enquiriesOlder: number;
  enquiriesLast7Days: number;
  categoriesActive: number;
};

function buildOverviewData(stats: AdminStats): OverviewDataPoint[] {
  const enquiriesOlder = Math.max(0, stats.enquiriesTotal - stats.enquiriesLast7Days);
  return [
    {
      name: "Brokers",
      brokersActive: stats.brokersActive,
      brokersPending: stats.brokersPending,
      brokersDisabled: stats.brokersDisabled,
      listingsPublished: 0,
      listingsDraft: 0,
      listingsRemoved: 0,
      enquiriesOlder: 0,
      enquiriesLast7Days: 0,
      categoriesActive: 0,
    },
    {
      name: "Listings",
      brokersActive: 0,
      brokersPending: 0,
      brokersDisabled: 0,
      listingsPublished: stats.listingsPublished,
      listingsDraft: stats.listingsDraft,
      listingsRemoved: stats.listingsRemoved,
      enquiriesOlder: 0,
      enquiriesLast7Days: 0,
      categoriesActive: 0,
    },
    {
      name: "Enquiries",
      brokersActive: 0,
      brokersPending: 0,
      brokersDisabled: 0,
      listingsPublished: 0,
      listingsDraft: 0,
      listingsRemoved: 0,
      enquiriesOlder,
      enquiriesLast7Days: stats.enquiriesLast7Days,
      categoriesActive: 0,
    },
    {
      name: "Categories",
      brokersActive: 0,
      brokersPending: 0,
      brokersDisabled: 0,
      listingsPublished: 0,
      listingsDraft: 0,
      listingsRemoved: 0,
      enquiriesOlder: 0,
      enquiriesLast7Days: 0,
      categoriesActive: stats.categoriesActive,
    },
  ];
}

type ChartOverviewProps = {
  stats: AdminStats;
};

export function ChartOverview({ stats }: ChartOverviewProps) {
  const data = buildOverviewData(stats);

  const hasBrokers = stats.brokersActive + stats.brokersPending + stats.brokersDisabled > 0;
  const hasListings =
    stats.listingsPublished + stats.listingsDraft + stats.listingsRemoved > 0;
  const hasEnquiries = stats.enquiriesTotal > 0;
  const hasCategories = stats.categoriesActive > 0;
  const hasAny =
    hasBrokers || hasListings || hasEnquiries || hasCategories;

  const yMax = Math.max(
    1,
    stats.brokersActive + stats.brokersPending + stats.brokersDisabled,
    stats.listingsPublished + stats.listingsDraft + stats.listingsRemoved,
    stats.enquiriesTotal,
    stats.categoriesActive
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4">
        <div>
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription className="mt-0.5">
            Current counts for brokers, listings, enquiries, and categories
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-5 pt-5 pb-4">
        {!hasAny ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-medium text-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">
              Counts will appear here as brokers, listings, and enquiries are added.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="min-h-[260px] w-full"
          >
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              layout="vertical"
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                type="number"
                domain={[0, yMax]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
                tickCount={Math.min(yMax + 1, 6)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    className="rounded-xl shadow-lg border-border/60"
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent className="text-xs mt-2" />} />

              {/* Brokers row */}
              <Bar
                dataKey="brokersActive"
                stackId="brokers"
                fill="var(--color-brokersActive)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="brokersPending"
                stackId="brokers"
                fill="var(--color-brokersPending)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="brokersDisabled"
                stackId="brokers"
                fill="var(--color-brokersDisabled)"
                radius={[0, 4, 4, 0]}
              />

              {/* Listings row */}
              <Bar
                dataKey="listingsPublished"
                stackId="listings"
                fill="var(--color-listingsPublished)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="listingsDraft"
                stackId="listings"
                fill="var(--color-listingsDraft)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="listingsRemoved"
                stackId="listings"
                fill="var(--color-listingsRemoved)"
                radius={[0, 4, 4, 0]}
              />

              {/* Enquiries row: older + last 7 days */}
              <Bar
                dataKey="enquiriesOlder"
                stackId="enquiries"
                fill="var(--color-enquiriesOlder)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="enquiriesLast7Days"
                stackId="enquiries"
                fill="var(--color-enquiriesLast7Days)"
                radius={[0, 4, 4, 0]}
              />

              {/* Categories row */}
              <Bar
                dataKey="categoriesActive"
                stackId="categories"
                fill="var(--color-categoriesActive)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
