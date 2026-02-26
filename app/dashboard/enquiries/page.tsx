import Link from "next/link";
import { getEnquiriesByBroker } from "@/lib/actions/enquiries";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EnquiriesPage() {
  const enquiries = await getEnquiriesByBroker();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enquiries</h1>
        <p className="text-muted-foreground mt-1">
          Enquiries from buyers about your listings. Contact them using the details below.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My enquiries</CardTitle>
          <CardDescription>
            {enquiries.length === 0
              ? "You haven’t received any enquiries yet."
              : `${enquiries.length} enquiry${enquiries.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Enquiries will appear here when someone uses the form on your listing pages.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="max-w-[200px]">Message</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      {e.listing ? (
                        <Link
                          href={`/dashboard/listings/${e.listing_id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          {e.listing.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{e.contact_name || e.contact_email}</p>
                        <a
                          href={`mailto:${e.contact_email}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {e.contact_email}
                        </a>
                        {e.contact_phone && (
                          <p className="text-xs text-muted-foreground">
                            <a href={`tel:${e.contact_phone}`} className="hover:underline">
                              {e.contact_phone}
                            </a>
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.reason ? (
                        <Badge variant="secondary">
                          {ENQUIRY_REASON_LABELS[e.reason] ?? e.reason}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="line-clamp-2 text-muted-foreground text-sm">
                        {e.message}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDate(e.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
