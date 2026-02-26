import Link from "next/link";
import { getEnquiriesByBroker } from "@/lib/actions/enquiries";
import { buildEnquiriesChartData } from "@/lib/chart-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChartLineEnquiries } from "@/components/dashboard/chart-line-enquiries";
import { EnquiriesTable } from "./enquiries-table";
import { Inbox } from "lucide-react";

export default async function EnquiriesPage() {
  const enquiries = await getEnquiriesByBroker();
  const total = enquiries.length;

  const newThisWeek = enquiries.filter((e) => {
    const diff = Date.now() - new Date(e.created_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const enquiriesChartData = buildEnquiriesChartData(enquiries);

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Enquiries
          </h1>
          <p className="text-sm text-muted-foreground">
            Messages from buyers interested in your listings.
          </p>
        </div>
        {total > 0 && newThisWeek > 0 && (
          <Badge className="w-fit sm:mt-1 gap-1.5" variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse" />
            {newThisWeek} new this week
          </Badge>
        )}
      </div>

      {/* ── Enquiries chart ── */}
      <ChartLineEnquiries
        data={enquiriesChartData}
        footer={{ description: "Enquiries received per month — last 6 months" }}
      />

      {/* ── Main card with list + detail sidebar ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-muted/30 px-4 py-4 sm:px-6">
          <div className="space-y-0.5">
            <CardTitle className="text-base">All enquiries</CardTitle>
            <CardDescription className="mt-0.5">
              {total === 0
                ? "No enquiries yet."
                : `${total} enquir${total === 1 ? "y" : "ies"} — click a row to view details.`}
            </CardDescription>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="ml-auto shrink-0">
              {total}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="font-medium">No enquiries yet</p>
                <p className="text-sm text-muted-foreground">
                  When someone submits the contact form on one of your listings,
                  their message will appear here.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/listings">View your listings</Link>
              </Button>
            </div>
          ) : (
            <EnquiriesTable enquiries={enquiries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}