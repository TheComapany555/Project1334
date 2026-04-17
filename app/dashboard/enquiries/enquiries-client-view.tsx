"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { EnquiriesTable } from "./enquiries-table";
import { Inbox } from "lucide-react";

type Props = {
  enquiries: EnquiryWithListing[];
  categoryOptions?: { value: string; label: string }[];
};

export function EnquiriesClientView({
  enquiries,
  categoryOptions = [],
}: Props) {
  const [categoryId, setCategoryId] = useState("");

  const filtered = useMemo(
    () =>
      categoryId
        ? enquiries.filter((e) => e.listing?.category?.id === categoryId)
        : enquiries,
    [enquiries, categoryId]
  );

  if (enquiries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b bg-muted/30 px-4 py-4 sm:px-6">
        <div>
          <CardTitle className="text-base">All enquiries</CardTitle>
          <CardDescription className="mt-0.5">
            Click View on a row to see full details and save the contact.
          </CardDescription>
        </div>
        {categoryOptions.length > 0 && (
          <Select
            value={categoryId || "all"}
            onValueChange={(val) => setCategoryId(val === "all" ? "" : val)}
          >
            <SelectTrigger
              className="w-[180px]"
              aria-label="Filter by category"
            >
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <EnquiriesTable enquiries={filtered} />
      </CardContent>
    </Card>
  );
}
