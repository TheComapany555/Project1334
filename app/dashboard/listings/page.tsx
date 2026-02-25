import Link from "next/link";
import { getListingsByBroker } from "@/lib/actions/listings";
import { getBrokerSlug } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingsTable } from "@/app/dashboard/listings/listings-table";

export default async function ListingsPage() {
  const [listings, brokerSlug] = await Promise.all([
    getListingsByBroker(),
    getBrokerSlug(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Listings</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your business listings.
          </p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto sm:size-default">
          <Link href="/dashboard/listings/new">Add listing</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle>Your listings</CardTitle>
          <CardDescription>
            Edit, change status, or delete. View public page when published.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 sm:pt-0 pb-6">
          <div className="overflow-x-auto px-4 sm:px-6">
            <ListingsTable listings={listings} brokerSlug={brokerSlug ?? undefined} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
