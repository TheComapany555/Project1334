import Link from "next/link";
import { getSession } from "@/lib/auth-client";
import { getAdminStats } from "@/lib/actions/admin-stats";
import { getAllEnquiries } from "@/lib/actions/enquiries";
import { getAllListingsForAdmin } from "@/lib/actions/admin-listings";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ChartLineListings } from "@/components/dashboard/chart-line-listings";
import { ChartOverview } from "@/components/admin/chart-overview";
import { buildListingsChartData } from "@/lib/chart-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { Users, FileText, Mail, FolderTree } from "lucide-react";

export default async function AdminPage() {
  const [session, stats, { enquiries: recentEnquiries }, allListings] = await Promise.all([
    getSession(),
    getAdminStats(),
    getAllEnquiries({ page: 1, pageSize: 10 }),
    getAllListingsForAdmin(),
  ]);

  const listingsChartData = buildListingsChartData(
    allListings.map((l) => ({ created_at: l.created_at, status: l.status }))
  );

  const totalBrokers = stats.brokersActive + stats.brokersPending + stats.brokersDisabled;
  const totalListings =
    stats.listingsPublished + stats.listingsDraft + stats.listingsRemoved;

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
              ? `${stats.brokersPending} pending, ${stats.brokersActive} active, ${stats.brokersDisabled} disabled`
              : `${stats.brokersActive} active, ${stats.brokersDisabled} disabled`
          }
          href="/admin/brokers"
          linkLabel="Manage brokers"
        />
        <StatCard
          label="Listings"
          value={totalListings}
          icon={FileText}
          description={`${stats.listingsPublished} published, ${stats.listingsDraft} draft, ${stats.listingsRemoved} removed`}
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

      {/* Overview chart: Brokers, Listings, Enquiries, Categories */}
      <ChartOverview stats={stats} />

      {/* Listings over time chart */}
      <ChartLineListings
        data={listingsChartData}
        footer={{
          description: "New listings added and status breakdown across all brokers — last 6 months",
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Latest enquiries across all brokers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEnquiries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No enquiries yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentEnquiries.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/enquiries?page=1`}
                        className="font-medium text-primary hover:underline line-clamp-1"
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
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link href="/admin/enquiries">View all enquiries</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Manage brokers, listings, categories, and enquiries from the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
