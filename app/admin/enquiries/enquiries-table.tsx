"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import type { EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  Calendar,
  Mail,
  Phone,
  Tag,
  User,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

const REASON_OPTIONS = Object.entries(ENQUIRY_REASON_LABELS).map(
  ([value, label]) => ({ value, label })
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name?: string | null, email?: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email ?? "?")[0].toUpperCase();
}

type Props = {
  enquiries: EnquiryWithListingAndBroker[];
};

export function EnquiriesTable({ enquiries }: Props) {
  const [selected, setSelected] = useState<EnquiryWithListingAndBroker | null>(
    null
  );

  const columns = useMemo<ColumnDef<EnquiryWithListingAndBroker>[]>(
    () => [
      {
        id: "contact",
        accessorFn: (row) =>
          `${row.contact_name ?? ""} ${row.contact_email}`.trim(),
        meta: { label: "Contact" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contact" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {getInitials(row.original.contact_name, row.original.contact_email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight truncate">
                {row.original.contact_name || row.original.contact_email}
              </p>
              {row.original.contact_name && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {row.original.contact_email}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "listing",
        accessorFn: (row) => row.listing?.title ?? "",
        meta: { label: "Listing" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listing" />
        ),
        cell: ({ row }) =>
          row.original.listing ? (
            <Link
              href={`/listing/${row.original.listing.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 max-w-[220px] truncate"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">{row.original.listing.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">No listing</span>
          ),
      },
      {
        id: "broker",
        accessorFn: (row) => row.broker?.name ?? row.broker?.company ?? "",
        meta: { label: "Broker" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Broker" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.broker?.name ??
              row.original.broker?.company ??
              "Not specified"}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        meta: { label: "Reason" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Reason" />
        ),
        cell: ({ row }) =>
          row.original.reason ? (
            <Badge variant="secondary" className="text-xs">
              {ENQUIRY_REASON_LABELS[row.original.reason] ?? row.original.reason}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not specified</span>
          ),
        filterFn: (row, id, value: string[]) => {
          const v = row.getValue<string | null>(id);
          return value.includes(v ?? "");
        },
      },
      {
        accessorKey: "created_at",
        meta: { label: "Date" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateShort(row.original.created_at)}
          </span>
        ),
        sortingFn: (a, b) =>
          new Date(a.original.created_at).getTime() -
          new Date(b.original.created_at).getTime(),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(row.original)}
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={enquiries}
        searchColumnId={["contact", "listing"]}
        searchPlaceholder="Search by contact, email or listing…"
        facetedFilters={[
          { columnId: "reason", title: "Reason", options: REASON_OPTIONS },
        ]}
        initialSorting={[{ id: "created_at", desc: true }]}
        defaultPageSize={20}
      />

      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto p-0"
        >
          {selected && (
            <>
              <div className="px-6 py-5 border-b bg-muted/30">
                <SheetHeader className="mb-3">
                  <SheetTitle className="text-base">Enquiry details</SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                      {getInitials(
                        selected.contact_name,
                        selected.contact_email
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {selected.contact_name || selected.contact_email}
                    </p>
                    {selected.contact_name && (
                      <p className="text-xs text-muted-foreground">
                        {selected.contact_email}
                      </p>
                    )}
                    {selected.reason && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {ENQUIRY_REASON_LABELS[selected.reason] ??
                          selected.reason}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5 text-sm">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Listing
                  </p>
                  {selected.listing ? (
                    <Link
                      href={`/listing/${selected.listing.slug}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selected.listing.title}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No listing linked</span>
                  )}
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Broker
                  </p>
                  <p className="font-medium">
                    {selected.broker
                      ? [selected.broker.name, selected.broker.company]
                          .filter(Boolean)
                          .join(" · ") || "Not specified"
                      : "Not specified"}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Contact
                  </p>
                  <div className="space-y-2">
                    {selected.contact_name && (
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{selected.contact_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${selected.contact_email}`}
                        className="text-primary hover:underline break-all"
                      >
                        {selected.contact_email}
                      </a>
                    </div>
                    {selected.contact_phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`tel:${selected.contact_phone}`}
                          className="text-primary hover:underline"
                        >
                          {selected.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Reason
                  </p>
                  {selected.reason ? (
                    <Badge variant="secondary">
                      {ENQUIRY_REASON_LABELS[selected.reason] ?? selected.reason}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </p>
                  <p className="whitespace-pre-wrap bg-muted/40 border p-3.5 text-sm leading-relaxed">
                    {selected.message}
                  </p>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Date
                  </p>
                  <p className="text-muted-foreground">
                    {formatDate(selected.created_at)}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <a href={`mailto:${selected.contact_email}`}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Email contact
                    </a>
                  </Button>
                  {selected.contact_phone && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <a href={`tel:${selected.contact_phone}`}>
                        <Phone className="h-3.5 w-3.5 mr-1.5" />
                        Call contact
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
