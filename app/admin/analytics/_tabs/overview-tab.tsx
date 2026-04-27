import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  FileText,
  Inbox,
  Tag,
  CreditCard,
  Eye,
  Phone,
  ShieldCheck,
  Send,
} from "lucide-react";
import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import { AreaTrendChart } from "@/components/admin/analytics/area-trend-chart";
import { DonutChart } from "@/components/admin/analytics/donut-chart";
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

export function OverviewTab({ analytics }: { analytics: AdminAnalytics }) {
  const { kpis, charts } = analytics;

  return (
    <div className="space-y-6">
      {/* Primary KPI strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Revenue (30d)"
          value={formatCurrencyAUD(kpis.revenueLast30Days)}
          subValue={`${formatCurrencyAUD(kpis.totalRevenue)} all time`}
          current={kpis.revenueLast30Days}
          previous={kpis.revenuePrev30Days}
          icon={<DollarSign className="h-4 w-4" />}
          tone="emerald"
        />
        <KpiCard
          label="MRR"
          value={formatCurrencyAUD(kpis.mrr)}
          subValue={`${kpis.activeSubscriptions} active subs`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="primary"
        />
        <KpiCard
          label="Published listings"
          value={String(kpis.publishedListings)}
          subValue={`${kpis.draftListings} in draft`}
          current={kpis.newListingsLast30Days}
          previous={kpis.newListingsPrev30Days}
          icon={<FileText className="h-4 w-4" />}
        />
        <KpiCard
          label="Enquiries (30d)"
          value={String(kpis.enquiriesLast30Days)}
          subValue={`${kpis.totalEnquiries} all time`}
          current={kpis.enquiriesLast30Days}
          previous={kpis.enquiriesPrev30Days}
          icon={<Inbox className="h-4 w-4" />}
          tone="amber"
        />
      </section>

      {/* Secondary KPI strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <SecondaryKpi
          label="Views (30d)"
          value={kpis.viewsLast30Days}
          icon={<Eye className="h-3.5 w-3.5" />}
          current={kpis.viewsLast30Days}
          previous={kpis.viewsPrev30Days}
        />
        <SecondaryKpi
          label="Calls (30d)"
          value={kpis.callsLast30Days}
          icon={<Phone className="h-3.5 w-3.5" />}
        />
        <SecondaryKpi
          label="NDAs signed"
          value={kpis.totalNDASignatures}
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
        />
        <SecondaryKpi
          label="Share invites"
          value={kpis.totalShareInvites}
          icon={<Send className="h-3.5 w-3.5" />}
        />
        <SecondaryKpi
          label="Active agencies"
          value={kpis.activeAgencies}
          icon={<Building2 className="h-3.5 w-3.5" />}
        />
        <SecondaryKpi
          label="Active brokers"
          value={kpis.activeBrokers}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <SecondaryKpi
          label="Active subs"
          value={kpis.activeSubscriptions}
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />
        <SecondaryKpi
          label="Promo redemptions"
          value={kpis.totalDiscountRedemptions}
          icon={<Tag className="h-3.5 w-3.5" />}
        />
      </section>

      {/* Hero: revenue trend + revenue breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AreaTrendChart
          className="lg:col-span-2"
          title="Revenue, last 12 months"
          description="Paid transactions only, by month."
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
          description="Share of paid revenue."
          data={charts.revenueByPaymentType}
          colors={PAYMENT_TYPE_COLORS}
          showAmount
          totalLabel="Revenue"
          height={260}
        />
      </section>

      {/* Engagement + subs glance */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AreaTrendChart
          className="lg:col-span-2"
          title="Marketplace engagement"
          description="Buyer enquiries received each month."
          data={charts.enquiriesByMonth}
          color="hsl(45, 100%, 51%)"
          seriesLabel="Enquiries"
          valueKind="count"
          height={240}
        />
        <DonutChart
          title="Subscriptions"
          description="Current snapshot across all states."
          data={charts.subscriptionsByStatus}
          colors={SUB_STATUS_COLORS}
          totalLabel="Subscriptions"
          height={240}
        />
      </section>
    </div>
  );
}

function SecondaryKpi({
  label,
  value,
  icon,
  current,
  previous,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  current?: number;
  previous?: number;
}) {
  const delta =
    current !== undefined && previous !== undefined && previous > 0
      ? Math.round(((current - previous) / previous) * 100)
      : null;
  return (
    <div className="rounded-lg border bg-card px-3 py-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold tabular-nums leading-tight">
        {value.toLocaleString("en-AU")}
      </p>
      {delta !== null && (
        <p
          className={
            delta >= 0
              ? "text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums"
              : "text-[10px] text-rose-600 dark:text-rose-400 tabular-nums"
          }
        >
          {delta >= 0 ? "+" : ""}
          {delta}% vs prev 30d
        </p>
      )}
    </div>
  );
}
