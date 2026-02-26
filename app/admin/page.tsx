import Link from "next/link";
import { getSession } from "@/lib/auth-client";
import { getAdminStats } from "@/lib/actions/admin-stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const [session, stats] = await Promise.all([getSession(), getAdminStats()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          Signed in as {session?.user?.email} (admin).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Brokers</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.brokersActive + stats.brokersDisabled}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.brokersActive} active, {stats.brokersDisabled} disabled
            </p>
            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link href="/admin/brokers">Manage brokers</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Listings</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.listingsPublished + stats.listingsDraft + stats.listingsRemoved}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.listingsPublished} published, {stats.listingsDraft} draft, {stats.listingsRemoved} removed
            </p>
            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link href="/admin/listings">Moderate listings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enquiries</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.enquiriesTotal}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.enquiriesLast7Days} in the last 7 days
            </p>
            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link href="/admin/enquiries">View all</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.categoriesActive}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active categories</p>
            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link href="/admin/categories">Manage categories</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
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
  );
}
