import Link from "next/link";
import { getSession } from "@/lib/auth-client";
import { getAdminStats } from "@/lib/actions/admin-stats";
import { getAllEnquiries } from "@/lib/actions/enquiries";
import { getAllListingsForAdmin } from "@/lib/actions/admin-listings";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ChartBarListings } from "@/components/dashboard/chart-bar-listings";
import { ChartDonut } from "@/components/admin/chart-donut";
import { ChartBarEnquiries } from "@/components/admin/chart-bar-enquiries";
import { ChartRadialOverview } from "@/components/admin/chart-radial-overview";
import { buildListingsChartData, buildEnquiriesChartData } from "@/lib/chart-data";
import { CHART_COLORS } from "@/lib/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { Users, FileText, Mail, FolderTree } from "lucide-react";

export default async function AdminPage() {
  const [session, stats, { enquiries: recentEnquiries }, { enquiries: allEnquiries }, allListings] = await Promise.all([
    getSession(),
    getAdminStats(),
    getAllEnquiries({ page: 1, pageSize: 10 }),
    getAllEnquiries({ page: 1, pageSize: 500 }),
    getAllListingsForAdmin(),
  ]);

  const listingsChartData = buildListingsChartData(
    allListings.map((l) => ({ created_at: l.created_at, status: l.status }))
  );

  const enquiriesChartData = buildEnquiriesChartData(
    allEnquiries.map((e) => ({ created_at: e.created_at }))
  );

  const totalBrokers = stats.brokersActive + stats.brokersPending + stats.brokersDisabled;
  const totalListings =
    stats.listingsPublished + stats.listingsDraft + stats.listingsRemoved;
  const enquiriesOlder = Math.max(0, stats.enquiriesTotal - stats.enquiriesLast7Days);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description={`Signed in as ${session?.user?.email} (admin).`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Brokers"
          value={totalBrokers}
          icon={Users}
          description={
            stats.brokersPending > 0
              ? `${stats.brokersPending} pending, ${stats.brokersActive} active`
              : `${stats.brokersActive} active, ${stats.brokersDisabled} disabled`
          }
          href="/admin/brokers"
          linkLabel="Manage brokers"
        />
        <StatCard
          label="Listings"
          value={totalListings}
          icon={FileText}
          description={`${stats.listingsPublished} published, ${stats.listingsDraft} draft`}
          href="/admin/listings"
          linkLabel="Moderate listings"
        />
        <StatCard
          label="Enquiries"
          value={stats.enquiriesTotal}
          icon={Mail}
          description={`${stats.enquiriesLast7Days} in the last 7 days`}
          href="/admin/enquiries"
          linkLabel="View all"
        />
        <StatCard
          label="Categories"
          value={stats.categoriesActive}
          icon={FolderTree}
          description="Active categories"
          href="/admin/categories"
          linkLabel="Manage categories"
        />
      </div>

      {/* ── Radial overview + Donut breakdown charts ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChartRadialOverview
          brokers={totalBrokers}
          listings={totalListings}
          enquiries={stats.enquiriesTotal}
          categories={stats.categoriesActive}
        />
        <ChartDonut
          title="Brokers"
          segments={[
            { name: "Active", value: stats.brokersActive, color: CHART_COLORS.primary },
            { name: "Pending", value: stats.brokersPending, color: CHART_COLORS.warning },
            { name: "Disabled", value: stats.brokersDisabled, color: CHART_COLORS.purple },
          ]}
        />
        <ChartDonut
          title="Listings"
          segments={[
            { name: "Published", value: stats.listingsPublished, color: CHART_COLORS.primary },
            { name: "Draft", value: stats.listingsDraft, color: CHART_COLORS.warning },
            { name: "Removed", value: stats.listingsRemoved, color: CHART_COLORS.muted },
          ]}
        />
        <ChartDonut
          title="Enquiries"
          segments={[
            { name: "Last 7 days", value: stats.enquiriesLast7Days, color: CHART_COLORS.info },
            { name: "Older", value: enquiriesOlder, color: CHART_COLORS.purple },
          ]}
        />
      </div>

      {/* ── Time-series charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBarListings
          data={listingsChartData}
          footer={{
            description: "Listings across all brokers — last 6 months",
          }}
        />
        <ChartBarEnquiries data={enquiriesChartData} />
      </div>

      {/* ── Recent activity + Quick links ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-3">
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <CardDescription className="text-xs">
              Latest enquiries across all brokers
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {recentEnquiries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No enquiries yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {recentEnquiries.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        href="/admin/enquiries?page=1"
                        className="text-sm font-medium text-primary hover:underline line-clamp-1"
                      >
                        {e.listing?.title ?? "Listing"}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.contact_name || e.contact_email} · {formatRelativeTime(e.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {recentEnquiries.length > 0 && (
              <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                <Link href="/admin/enquiries">View all enquiries</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border bg-muted/40 px-5 py-3">
            <CardTitle className="text-sm">Quick links</CardTitle>
            <CardDescription className="text-xs">
              Manage from the sidebar or use these shortcuts.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/brokers">Brokers</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/listings">Listings</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/enquiries">Enquiries</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/categories">Categories</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
