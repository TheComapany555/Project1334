import { getBrokerPayments } from "@/lib/actions/payments";
import { getBrokerFeaturedListings } from "@/lib/actions/featured";
import { getListingsByBroker } from "@/lib/actions/listings";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaymentHistory } from "@/components/payments/payment-history";
import { FeaturedListingsTable } from "@/components/payments/featured-listings-table";

export default async function BrokerPaymentsPage() {
  const [payments, featuredListings, allListings] = await Promise.all([
    getBrokerPayments(),
    getBrokerFeaturedListings(),
    getListingsByBroker(),
  ]);

  // Combine active + expired featured (all listings that have ever been featured)
  const everFeatured = allListings.filter(
    (l) => l.featured_until != null
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        description="View your payment history and featured listing status."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{payments.length}</span>
            <span className="text-xs text-muted-foreground">Total payments</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-amber-500">
              {featuredListings.length}
            </span>
            <span className="text-xs text-muted-foreground">Active featured</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-muted-foreground">
              {everFeatured.filter(
                (l) => l.featured_until && new Date(l.featured_until) < new Date()
              ).length}
            </span>
            <span className="text-xs text-muted-foreground">Expired featured</span>
          </CardContent>
        </Card>
      </div>

      {/* Active Featured Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active featured listings</CardTitle>
          <CardDescription>Listings currently promoted with featured status.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <FeaturedListingsTable listings={everFeatured} type="active" />
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
          <CardDescription>All your featured listing payments.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <PaymentHistory payments={payments} />
        </CardContent>
      </Card>

      {/* Expired Featured Listings */}
      {everFeatured.some(
        (l) => l.featured_until && new Date(l.featured_until) < new Date()
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expired featured listings</CardTitle>
            <CardDescription>Previously featured listings whose promotion period has ended.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <FeaturedListingsTable listings={everFeatured} type="expired" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
