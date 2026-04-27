import type { AdminAnalytics } from "@/lib/types/admin-analytics";
import { AreaTrendChart } from "@/components/admin/analytics/area-trend-chart";
import { DonutChart } from "@/components/admin/analytics/donut-chart";
import { TableSection } from "@/components/admin/analytics/table-section";
import { TopCategoriesTable } from "../_tables/top-categories-table";
import { TopListingsTable } from "../_tables/top-listings-table";

const LISTING_STATUS_COLORS = {
  published: "hsl(160, 84%, 39%)",
  draft: "hsl(0, 0%, 60%)",
  under_offer: "hsl(45, 100%, 51%)",
  sold: "var(--primary)",
  unpublished: "hsl(340, 60%, 60%)",
};

const TIER_COLORS = {
  basic: "hsl(0, 0%, 60%)",
  standard: "var(--primary)",
  featured: "hsl(45, 100%, 51%)",
};

export function ListingsTab({ analytics }: { analytics: AdminAnalytics }) {
  const { kpis, charts } = analytics;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaTrendChart
          title="New listings, last 12 months"
          description="Listings created each month (including drafts)."
          data={charts.newListingsByMonth}
          color="var(--primary)"
          seriesLabel="Listings"
          valueKind="count"
          headlineValue={String(kpis.publishedListings + kpis.draftListings)}
          headlineLabel="Live listings"
          height={260}
        />
        <AreaTrendChart
          title="Views, last 12 months"
          description="All listing detail-page views, web and mobile."
          data={charts.viewsByMonth}
          color="hsl(189, 94%, 43%)"
          seriesLabel="Views"
          valueKind="count"
          headlineValue={kpis.totalViews.toLocaleString("en-AU")}
          headlineLabel="All time"
          height={260}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChart
          title="Listings by status"
          data={charts.listingsByStatus}
          colors={LISTING_STATUS_COLORS}
          totalLabel="Listings"
          height={220}
        />
        <DonutChart
          title="Listings by tier"
          description="Distribution of paid visibility upgrades."
          data={charts.listingsByTier}
          colors={TIER_COLORS}
          totalLabel="Listings"
          height={220}
        />
        <DonutChart
          title="Views by platform"
          description="Where buyers are reading listings."
          data={charts.viewsByPlatform}
          colors={{ web: "var(--primary)", mobile: "hsl(45, 100%, 51%)" }}
          totalLabel="Views"
          height={220}
        />
      </section>

      <TableSection
        title="Trending categories"
        description="Top categories by active listings, with the enquiries they have generated."
      >
        <TopCategoriesTable data={charts.topCategories} />
      </TableSection>

      <TableSection
        title="Top listings by views"
        description="Most-viewed listings across the platform. Filter by tier or search by listing or agency."
      >
        <TopListingsTable data={charts.topListingsByViews} sortBy="views" />
      </TableSection>

      <TableSection
        title="Top listings by enquiries"
        description="Listings receiving the most buyer enquiries."
      >
        <TopListingsTable
          data={charts.topListingsByEnquiries}
          sortBy="enquiries"
        />
      </TableSection>
    </div>
  );
}
