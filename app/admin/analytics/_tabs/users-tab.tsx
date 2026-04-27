import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { AreaTrendChart } from "@/components/admin/analytics/area-trend-chart";
import { DonutChart } from "@/components/admin/analytics/donut-chart";
import { TableSection } from "@/components/admin/analytics/table-section";
import { TopAgenciesTable } from "../_tables/top-agencies-table";
import { TopBrokersTable } from "../_tables/top-brokers-table";

const STATUS_COLORS = {
  active: "hsl(160, 84%, 39%)",
  pending: "hsl(45, 100%, 51%)",
  disabled: "hsl(340, 60%, 60%)",
};

export function UsersTab({ analytics }: { analytics: AdminAnalytics }) {
  const { kpis, charts } = analytics;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          title="Agency signups"
          description="New agencies created per month."
          data={charts.newAgenciesByMonth}
          color="hsl(258, 90%, 66%)"
          seriesLabel="Agencies"
          valueKind="count"
          headlineValue={String(kpis.totalAgencies)}
          headlineLabel="Total agencies"
          height={260}
        />
        <AreaTrendChart
          title="Broker signups"
          description="New brokers per month (across all agencies)."
          data={charts.newBrokersByMonth}
          color="hsl(189, 94%, 43%)"
          seriesLabel="Brokers"
          valueKind="count"
          headlineValue={String(kpis.totalBrokers)}
          headlineLabel="Total brokers"
          height={260}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart
          title="Agencies by status"
          data={charts.agenciesByStatus}
          colors={STATUS_COLORS}
          totalLabel="Agencies"
          height={220}
        />
        <DonutChart
          title="Brokers by status"
          data={charts.brokersByStatus}
          colors={STATUS_COLORS}
          totalLabel="Brokers"
          height={220}
        />
      </section>

      <TableSection
        title="Top agencies"
        description="Agencies ranked by paid revenue contribution. Sortable by brokers, listings, revenue."
      >
        <TopAgenciesTable data={charts.topAgencies} />
      </TableSection>

      <TableSection
        title="Top brokers"
        description="Brokers ranked by enquiries received on their listings."
      >
        <TopBrokersTable data={charts.topBrokers} />
      </TableSection>
    </div>
  );
}
