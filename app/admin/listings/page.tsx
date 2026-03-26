import { getAllListingsForAdmin } from "@/lib/actions/admin-listings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { FileText } from "lucide-react";
import { AdminListingsTable } from "./listings-table";

export default async function AdminListingsPage() {
  const listings = await getAllListingsForAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listings"
        description="Moderate listings. Removed listings are hidden from search and public pages."
      />
      <Card>
        <CardHeader>
          <CardTitle>Moderate listings</CardTitle>
          <CardDescription>
            Remove a listing from the marketplace or restore it. Brokers can still see their own listings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No listings yet</p>
              <p className="text-sm text-muted-foreground">Listings will appear here once brokers create them.</p>
            </div>
          ) : (
            <AdminListingsTable listings={listings} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
