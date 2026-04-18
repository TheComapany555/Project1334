"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { FeaturedBadge } from "@/components/listings/featured-badge";
import { isListingFeaturedAnywhere } from "@/lib/featured-dates";
import { ListingActions } from "./listing-actions";

type AdminListing = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_featured: boolean;
  featured_until: string | null;
  featured_homepage_until: string | null;
  featured_category_until: string | null;
  admin_removed_at: string | null;
  created_at: string;
  broker?: { name: string | null; company: string | null } | null;
};

const STATUS_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
  { value: "unpublished", label: "Unpublished" },
];

const VISIBILITY_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "removed", label: "Removed" },
];

const FEATURED_OPTIONS = [
  { value: "yes", label: "Featured" },
  { value: "no", label: "Not featured" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminListingsTable({ listings }: { listings: AdminListing[] }) {
  const columns = useMemo<ColumnDef<AdminListing>[]>(
    () => [
      {
        accessorKey: "title",
        meta: { label: "Title" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
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
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} className="border-0" />
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        id: "visibility",
        accessorFn: (row) => (row.admin_removed_at ? "removed" : "visible"),
        meta: { label: "Visibility" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Visibility" />
        ),
        cell: ({ row }) => {
          const isRemoved = !!row.original.admin_removed_at;
          return (
            <StatusBadge
              status={isRemoved ? "removed" : "active"}
              label={isRemoved ? "Removed" : "Visible"}
              className="border-0"
            />
          );
        },
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        id: "featured",
        accessorFn: (row) => (isListingFeaturedAnywhere(row) ? "yes" : "no"),
        meta: { label: "Featured" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Featured" />
        ),
        cell: ({ row }) =>
          isListingFeaturedAnywhere(row.original) ? (
            <FeaturedBadge size="sm" />
          ) : (
            <Badge variant="outline" className="text-xs border-0 text-muted-foreground">
              No
            </Badge>
          ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        accessorKey: "created_at",
        meta: { label: "Created" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <ListingActions
            listingId={row.original.id}
            slug={row.original.slug}
            isRemoved={!!row.original.admin_removed_at}
            featured_homepage_until={row.original.featured_homepage_until}
            featured_category_until={row.original.featured_category_until}
            featured_until={row.original.featured_until}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={listings}
        searchColumnId={["title", "broker"]}
        searchPlaceholder="Search by title or broker…"
        facetedFilters={[
          { columnId: "status", title: "Status", options: STATUS_OPTIONS },
          {
            columnId: "visibility",
            title: "Visibility",
            options: VISIBILITY_OPTIONS,
          },
          {
            columnId: "featured",
            title: "Featured",
            options: FEATURED_OPTIONS,
          },
        ]}
        initialSorting={[{ id: "created_at", desc: true }]}
      />
    </div>
  );
}
