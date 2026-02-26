import Link from "next/link";
import { getAllEnquiries } from "@/lib/actions/enquiries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnquiriesTable } from "./enquiries-table";
import { Inbox } from "lucide-react";

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function AdminEnquiriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { enquiries, total } = await getAllEnquiries({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enquiries</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All enquiries submitted across brokers and listings.
          </p>
        </div>
        {total > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1 shrink-0 mt-1">
            {total} total
          </Badge>
        )}
      </div>

      {/* Main card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All enquiries</CardTitle>
              <CardDescription className="mt-0.5">
                {total === 0
                  ? "No enquiries yet."
                  : `Showing ${enquiries.length} of ${total} enquir${total === 1 ? "y" : "ies"}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
              <div className="rounded-full bg-muted p-4">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">No enquiries yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Enquiries will appear here when buyers contact brokers from listing pages.
                </p>
              </div>
            </div>
          ) : (
            <>
              <EnquiriesTable enquiries={enquiries} page={page} totalPages={totalPages} />

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild disabled={page <= 1}>
                      <Link href={page <= 1 ? "#" : `/admin/enquiries?page=${page - 1}`}>
                        Previous
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
                      <Link href={page >= totalPages ? "#" : `/admin/enquiries?page=${page + 1}`}>
                        Next
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}