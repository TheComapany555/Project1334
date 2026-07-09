import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { AreaTrendChart } from "@/components/admin/analytics/area-trend-chart";
import { DonutChart } from "@/components/admin/analytics/donut-chart";
import { TableSection } from "@/components/admin/analytics/table-section";
import { RecentPaymentsTable } from "../_tables/recent-payments-table";
import { formatCurrencyAUD } from "@/lib/utils/format";

const PAYMENT_TYPE_COLORS = {
  featured: "var(--chart-3)", // amber
  listing_tier: "var(--chart-1)", // green
  subscription: "var(--chart-2)", // blue
};

const SUB_STATUS_COLORS = {
  active: "var(--chart-1)", // green
  trialing: "var(--chart-2)", // blue
  past_due: "var(--chart-3)", // amber
  cancelled: "var(--chart-5)", // magenta
  expired: "var(--muted-foreground)", // neutral
  pending: "var(--chart-4)", // violet
};

const PAYMENT_STATUS_COLORS = {
  paid: "var(--chart-1)", // green
  pending: "var(--chart-3)", // amber
  invoiced: "var(--chart-2)", // blue
  approved: "var(--chart-4)", // violet
};

export function RevenueTab({ analytics }: { analytics: AdminAnalytics }) {
  const { kpis, charts } = analytics;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AreaTrendChart
          className="lg:col-span-2"
          title="Revenue trend"
          description="Paid transactions, last 12 months."
          data={charts.revenueByMonth.map((d) => ({
            month: d.month,
            value: d.revenue,
          }))}
          headlineValue={formatCurrencyAUD(kpis.totalRevenue)}
          headlineLabel="All time revenue"
          color="var(--chart-1)"
          seriesLabel="Revenue"
          valueKind="currency"
          height={280}
        />
        <DonutChart
          title="Revenue by product type"
          description="Where the money is coming from."
          data={charts.revenueByPaymentType}
          colors={PAYMENT_TYPE_COLORS}
          showAmount
          totalLabel="Revenue"
          height={260}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AreaTrendChart
          className="lg:col-span-2"
          title="Recurring revenue (MRR)"
          description="Monthly recurring revenue at the end of each month."
          data={charts.mrrByMonth}
          headlineValue={formatCurrencyAUD(kpis.mrr)}
          headlineLabel="Current MRR"
          color="var(--chart-1)"
          seriesLabel="MRR"
          valueKind="currency"
          height={260}
        />
        <DonutChart
          title="Subscription status"
          description="Snapshot across all subscriptions."
          data={charts.subscriptionsByStatus}
          colors={SUB_STATUS_COLORS}
          totalLabel="Subscriptions"
          height={240}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart
          title="Payments by status"
          description="All-time payment records by their current status."
          data={charts.paymentsByStatus}
          colors={PAYMENT_STATUS_COLORS}
          totalLabel="Transactions"
          height={240}
        />
        <AreaTrendChart
          title="Transactions per month"
          description="Number of paid transactions, last 12 months."
          data={charts.paymentsByMonth}
          color="var(--chart-4)"
          seriesLabel="Transactions"
          valueKind="count"
          height={240}
        />
      </section>

      <TableSection
        title="Recent transactions"
        description="Latest payment records across the platform. Filter by status or search by broker / product."
      >
        <RecentPaymentsTable data={charts.recentPayments} />
      </TableSection>
    </div>
  );
}
