import Link from "next/link";
import {
  getListingsByBroker,
  getCategories,
  getListingHighlights,
} from "@/lib/actions/listings";
import { getBrokerSlug } from "@/lib/actions/profile";
import { getSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/admin/page-header";
import { BrokerListingsWithFilter } from "@/app/dashboard/listings/broker-listings-filter";
import { PlusIcon, Building2Icon } from "lucide-react";

export default async function ListingsPage() {
  const [listings, brokerSlug, categories, highlights, session] = await Promise.all([
    getListingsByBroker(),
    getBrokerSlug(),
    getCategories(),
    getListingHighlights(),
    getSession(),
  ]);

  const isAgencyOwner = session?.user?.agencyRole === "owner";

  // Derive quick stats from listings
  const total = listings.length;
  const published = listings.filter((l) => l.status === "published").length;
  const drafts = listings.filter((l) => l.status === "draft").length;

  return (
    <div className="space-y-8">

      <PageHeader
        title="Listings"
        description="Create, publish, and manage your business listings."
        action={
          <Button asChild className="w-full sm:w-auto gap-1.5">
            <Link href="/dashboard/listings/new">
              <PlusIcon className="h-4 w-4" />
              Add listing
            </Link>
          </Button>
        }
      />

      {/* ── Summary stats ── */}
      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="py-4">
            <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
              <span className="text-2xl font-semibold">{total}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
              <span className="text-2xl font-semibold text-primary">{published}</span>
              <span className="text-xs text-muted-foreground">Published</span>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
              <span className="text-2xl font-semibold text-[var(--warning)]">{drafts}</span>
              <span className="text-xs text-muted-foreground">Drafts</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main card ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base">Your listings</CardTitle>
            <CardDescription className="text-sm">
              Edit details, change status, or remove listings. Published listings
              are visible on your public profile.
            </CardDescription>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="ml-auto shrink-0">
              {total} {total === 1 ? "listing" : "listings"}
            </Badge>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          {total === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <div className="rounded-full bg-muted p-4">
                  <Building2Icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="font-medium">No listings yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first listing to start attracting buyers and showcasing
                  your businesses.
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/dashboard/listings/new">
                  <PlusIcon className="h-4 w-4" />
                  Add your first listing
                </Link>
              </Button>
            </div>
          ) : (
            /* ── Table ── */
            <div className="overflow-x-auto">
              <div className="min-w-full px-4 sm:px-6 pt-4 pb-6">
                <BrokerListingsWithFilter
                  listings={listings}
                  categories={categories}
                  highlights={highlights}
                  brokerSlug={brokerSlug ?? undefined}
                  isAgencyOwner={isAgencyOwner}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}