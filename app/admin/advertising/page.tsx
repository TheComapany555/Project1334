import { getAllAdsForAdmin } from "@/lib/actions/admin-advertising";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusIcon, Megaphone } from "lucide-react";
import Link from "next/link";
import { AdvertisingTable } from "./advertising-table";

export default async function AdminAdvertisingPage() {
  const ads = await getAllAdsForAdmin();
  const now = new Date();

  const active = ads.filter((a) => a.status === "active").length;
  const expired = ads.filter(
    (a) => a.end_date && new Date(a.end_date) < now
  ).length;
  const totalImpressions = ads.reduce((s, a) => s + a.impression_count, 0);
  const totalClicks = ads.reduce((s, a) => s + a.click_count, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Advertising"
        description="Manage ad placements across the marketplace."
        action={
          <Button asChild className="w-full sm:w-auto gap-1.5">
            <Link href="/admin/advertising/new">
              <PlusIcon className="h-4 w-4" />
              Create ad
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{ads.length}</span>
            <span className="text-xs text-muted-foreground">Total ads</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-primary">{active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{totalImpressions.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Impressions</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{totalClicks.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Clicks</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All advertisements</CardTitle>
          <CardDescription>
            Ads are shown on public pages based on placement. Expired ads are
            auto-hidden.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {ads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No ads yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first ad to start monetising ad slots on the
                  marketplace.
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/admin/advertising/new">
                  <PlusIcon className="h-4 w-4" />
                  Create ad
                </Link>
              </Button>
            </div>
          ) : (
            <AdvertisingTable ads={ads} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
