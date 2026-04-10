import Link from "next/link";
import { getSession } from "@/lib/auth-client";
import { getAdminStats } from "@/lib/actions/admin-stats";
import { getAllEnquiries, getEnquiryChartData } from "@/lib/actions/enquiries";
import { getAllListingsForAdmin } from "@/lib/actions/admin-listings";
import { SectionCards } from "@/components/section-cards";
import { ChartOverview } from "@/components/dashboard/chart-overview";
import { buildOverviewChartData } from "@/lib/chart-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

export default async function AdminPage() {
  const [session, stats, { enquiries: recentEnquiries }, enquiryChartRows, allListings] = await Promise.all([
    getSession(),
    getAdminStats(),
    getAllEnquiries({ page: 1, pageSize: 10 }),
    getEnquiryChartData(),
    getAllListingsForAdmin(),
  ]);

  const totalBrokers = stats.brokersActive + stats.brokersPending + stats.brokersDisabled;
  const totalListings = stats.listingsPublished + stats.listingsDraft + stats.listingsRemoved;

  const overviewData = buildOverviewChartData(
    allListings.map((l) => ({ created_at: l.created_at })),
    enquiryChartRows.map((e) => ({ created_at: e.created_at }))
  );

  const statCards = [
    { title: "Agencies", value: totalBrokers, footer: `${stats.brokersActive} active, ${stats.brokersPending} pending`, href: "/admin/brokers" },
    { title: "Listings", value: totalListings, footer: `${stats.listingsPublished} published, ${stats.listingsDraft} draft`, href: "/admin/listings" },
    { title: "Enquiries", value: stats.enquiriesTotal, footer: `${stats.enquiriesLast7Days} in the last 7 days`, href: "/admin/enquiries" },
    { title: "Categories", value: stats.categoriesActive, footer: "Active categories", href: "/admin/categories" },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Signed in as {session?.user?.email}</p>
      </div>

      <SectionCards cards={statCards} />

      <ChartOverview data={overviewData} />

      {/* Recent activity + Quick links */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border px-5 py-3">
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <CardDescription className="text-xs">Latest enquiries across all brokers</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {recentEnquiries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No enquiries yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentEnquiries.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href="/admin/enquiries?page=1" className="text-sm font-medium text-primary hover:underline line-clamp-1">
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
          <CardHeader className="border-b border-border px-5 py-3">
            <CardTitle className="text-sm">Quick links</CardTitle>
            <CardDescription className="text-xs">Manage from the sidebar or use these shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/admin/brokers">Agencies</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/admin/listings">Listings</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/admin/enquiries">Enquiries</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/admin/categories">Categories</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/admin/payments">Payments</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
