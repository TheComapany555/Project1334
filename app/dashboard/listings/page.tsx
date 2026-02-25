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
import { ListingsTable } from "./listings-table";

export default async function ListingsPage() {
  const [listings, brokerSlug] = await Promise.all([
    getListingsByBroker(),
    getBrokerSlug(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
          <p className="text-muted-foreground">
            Create and manage your business listings.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/listings/new">Add listing</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your listings</CardTitle>
          <CardDescription>
            Edit, change status, or delete. View public page when published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListingsTable listings={listings} brokerSlug={brokerSlug ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
