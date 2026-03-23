"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import type { EnquiryWithListing } from "@/lib/types/enquiries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnquiriesTable } from "./enquiries-table";
import { Inbox, Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

const REASON_OPTIONS = Object.entries(ENQUIRY_REASON_LABELS).map(
  ([value, label]) => ({ value, label })
);

type Props = {
  enquiries: EnquiryWithListing[];
};

export function EnquiriesClientView({ enquiries }: Props) {
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const filterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const triggerFilterAnimation = useCallback(() => {
    setIsFiltering(true);
    clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => setIsFiltering(false), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(filterTimer.current);
  }, []);

  const total = enquiries.length;

  // Filter
  const filtered = useMemo(() => {
    if (!reason) return enquiries;
    return enquiries.filter((e) => e.reason === reason);
  }, [enquiries, reason]);

  const filteredTotal = filtered.length;
  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleReasonChange(val: string) {
    setReason(val === "all" ? "" : val);
    setPage(1);
    triggerFilterAnimation();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-muted/30 px-4 py-4 sm:px-6">
        <div className="space-y-0.5">
          <CardTitle className="text-base">All enquiries</CardTitle>
          <CardDescription className="mt-0.5">
            {total === 0
              ? "No enquiries yet."
              : reason
                ? `Showing ${filteredTotal} of ${total} enquir${total === 1 ? "y" : "ies"}. Click a row to view details.`
                : `${total} enquir${total === 1 ? "y" : "ies"}. Click a row to view details.`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Select value={reason || "all"} onValueChange={handleReasonChange}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by reason">
              <SelectValue placeholder="All reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {REASON_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {total > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {filteredTotal}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative p-0">
        {/* Filter loading overlay */}
        {isFiltering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Filtering…</span>
            </div>
          </div>
        )}
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
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="font-medium">No matching enquiries</p>
              <p className="text-sm text-muted-foreground">
                Try changing the filter to see more results.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReason("");
                setPage(1);
                triggerFilterAnimation();
              }}
            >
              Clear filter
            </Button>
          </div>
        ) : (
          <>
            <EnquiriesTable enquiries={paged} />

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <p className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
