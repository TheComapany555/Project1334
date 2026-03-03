import { getAllListingsForAdmin } from "@/lib/actions/admin-listings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListingActions } from "./listing-actions";
import { FileText } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
        <CardContent>
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No listings yet</p>
                <p className="text-sm text-muted-foreground">Listings will appear here once brokers create them.</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((l) => {
                  const isRemoved = !!l.admin_removed_at;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.broker?.name ?? l.broker?.company ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} className="border-0" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={isRemoved ? "removed" : "active"}
                          label={isRemoved ? "Removed" : "Visible"}
                          className="border-0"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(l.created_at)}
                      </TableCell>
                      <TableCell>
                        <ListingActions
                          listingId={l.id}
                          slug={l.slug}
                          isRemoved={isRemoved}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
