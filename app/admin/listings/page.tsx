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
import { Badge } from "@/components/ui/badge";
import { ListingActions } from "./listing-actions";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <p className="text-muted-foreground mt-1">
          Moderate listings. Removed listings are hidden from search and public pages.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Moderate listings</CardTitle>
          <CardDescription>
            Remove a listing from the marketplace or restore it. Brokers can still see their own listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No listings yet.
            </p>
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
                        <Badge
                          variant={
                            l.status === "published"
                              ? "success"
                              : l.status === "sold"
                                ? "destructive"
                                : l.status === "draft" || l.status === "under_offer"
                                  ? "warning"
                                  : "secondary"
                          }
                          className="border-0"
                        >
                          {l.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isRemoved ? "destructive" : "success"} className="border-0">
                          {isRemoved ? "Removed" : "Visible"}
                        </Badge>
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
