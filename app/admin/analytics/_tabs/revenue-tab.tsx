import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { AreaTrendChart } from "@/components/admin/analytics/area-trend-chart";
import { DonutChart } from "@/components/admin/analytics/donut-chart";
import { TableSection } from "@/components/admin/analytics/table-section";
import { RecentPaymentsTable } from "../_tables/recent-payments-table";
import { formatCurrencyAUD } from "@/lib/utils/format";

const PAYMENT_TYPE_COLORS = {
  featured: "hsl(45, 100%, 51%)",
  listing_tier: "var(--primary)",
  subscription: "hsl(160, 84%, 39%)",
};

const SUB_STATUS_COLORS = {
  active: "hsl(160, 84%, 39%)",
  trialing: "hsl(189, 94%, 43%)",
  past_due: "hsl(45, 100%, 51%)",
  cancelled: "hsl(340, 60%, 60%)",
  expired: "hsl(0, 0%, 60%)",
  pending: "hsl(258, 90%, 66%)",
};

const PAYMENT_STATUS_COLORS = {
  paid: "hsl(160, 84%, 39%)",
  pending: "hsl(45, 100%, 51%)",
  invoiced: "hsl(189, 94%, 43%)",
  approved: "hsl(258, 90%, 66%)",
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
          color="hsl(160, 84%, 39%)"
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
          color="var(--primary)"
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
          color="hsl(258, 90%, 66%)"
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
