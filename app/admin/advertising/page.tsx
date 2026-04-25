import { listAdminAds } from "@/lib/actions/admin-advertising";
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
import { DEFAULT_PAGE_SIZE } from "@/lib/types/pagination";

type SP = { [key: string]: string | string[] | undefined };

function pickStr(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || null;
}

export default async function AdminAdvertisingPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(pickStr(sp.page) ?? 1));
  const pageSize = Math.max(1, Number(pickStr(sp.pageSize) ?? DEFAULT_PAGE_SIZE));
  const q = pickStr(sp.q);
  const status = pickStr(sp.status);
  const placement = pickStr(sp.placement);

  // Stats query: lightweight — first page is enough to know the table is non-empty.
  // For accurate totals + impression sums, an SQL aggregate would be a follow-up.
  // Until then, fetch a capped recent window for the stat cards.
  const statsResult = await listAdminAds({ page: 1, pageSize: 200 });
  const result = await listAdminAds({ page, pageSize, q, status, placement });

  const now = new Date();
  const active = statsResult.rows.filter((a) => a.status === "active").length;
  const totalImpressions = statsResult.rows.reduce((s, a) => s + a.impression_count, 0);
  const totalClicks = statsResult.rows.reduce((s, a) => s + a.click_count, 0);
  void now;

  const hasFilters = !!(q || status || placement);

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{statsResult.total}</span>
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
            Ads are shown on public pages based on placement. Expired ads are auto-hidden.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {result.total === 0 && !hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No ads yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first ad to start monetising ad slots on the marketplace.
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
            <AdvertisingTable result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
