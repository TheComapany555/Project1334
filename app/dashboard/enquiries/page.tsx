import Link from "next/link";
import { getEnquiriesByBroker } from "@/lib/actions/enquiries";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, Phone, Inbox, ExternalLink } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative time label for recent enquiries, e.g. "2h ago", "3d ago" */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export default async function EnquiriesPage() {
  const enquiries = await getEnquiriesByBroker();
  const total = enquiries.length;

  // Simple "new this week" count for the stat badge
  const newThisWeek = enquiries.filter((e) => {
    const diff = Date.now() - new Date(e.created_at).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

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
          <Badge className="w-fit sm:mt-1 gap-1.5" variant="default">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
            {newThisWeek} new this week
          </Badge>
        )}
      </div>

      {/* ── Main card ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base">All enquiries</CardTitle>
            <CardDescription>
              {total === 0
                ? "No enquiries yet."
                : `${total} enquir${total === 1 ? "y" : "ies"} — contact buyers directly using the details below.`}
            </CardDescription>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="ml-auto shrink-0">
              {total}
            </Badge>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          {total === 0 ? (
            /* ── Empty state ── */
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
            /* ── Table ── */
            <TooltipProvider delayDuration={300}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Listing</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="max-w-[220px]">Message</TableHead>
                      <TableHead className="pr-6 text-right">Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiries.map((e) => (
                      <TableRow key={e.id} className="align-top">

                        {/* Listing */}
                        <TableCell className="pl-6 py-4">
                          {e.listing ? (
                            <Link
                              href={`/dashboard/listings/${e.listing_id}/edit`}
                              className="group inline-flex items-center gap-1 font-medium text-sm text-foreground hover:text-primary transition-colors"
                            >
                              <span className="line-clamp-2 max-w-[160px]">
                                {e.listing.title}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Buyer contact */}
                        <TableCell className="py-4">
                          <div className="space-y-1 min-w-[140px]">
                            <p className="font-medium text-sm leading-none">
                              {e.contact_name || "—"}
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={`mailto:${e.contact_email}`}
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="max-w-[160px] truncate">
                                      {e.contact_email}
                                    </span>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>Send email</TooltipContent>
                              </Tooltip>
                            </div>
                            {e.contact_phone && (
                              <a
                                href={`tel:${e.contact_phone}`}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Phone className="h-3 w-3 shrink-0" />
                                {e.contact_phone}
                              </a>
                            )}
                          </div>
                        </TableCell>

                        {/* Reason */}
                        <TableCell className="py-4">
                          {e.reason ? (
                            <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
                              {ENQUIRY_REASON_LABELS[e.reason] ?? e.reason}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Message */}
                        <TableCell className="py-4 max-w-[220px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="line-clamp-2 text-sm text-muted-foreground cursor-default">
                                {e.message}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs whitespace-pre-wrap text-xs"
                            >
                              {e.message}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="pr-6 py-4 text-right whitespace-nowrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground cursor-default">
                                {relativeTime(e.created_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {formatDate(e.created_at)}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}