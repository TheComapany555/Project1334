"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TopListing } from "@/lib/types/admin-analytics";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusPill } from "@/components/admin/analytics/status-pill";

const TIER_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "featured", label: "Featured" },
];

type Props = {
  data: TopListing[];
  /** Which column to sort by initially. */
  sortBy: "views" | "enquiries";
};

export function TopListingsTable({ data, sortBy }: Props) {
  const columns = useMemo<ColumnDef<TopListing>[]>(
    () => [
      {
        accessorKey: "title",
        meta: { label: "Listing" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listing" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[280px]">
            <Link
              href="/admin/listings"
              className="font-medium leading-tight hover:underline inline-flex items-center gap-1 truncate"
            >
              <span className="truncate">{row.original.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
            {row.original.agencyName && (
              <p className="text-xs text-muted-foreground truncate">
                {row.original.agencyName}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "tier",
        meta: { label: "Tier" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tier" />
        ),
        cell: ({ row }) =>
          row.original.tier ? (
            <StatusPill status={row.original.tier} />
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          ),
        filterFn: (row, id, value: string[]) => {
          const v = row.getValue<string | null>(id);
          return v ? value.includes(v) : false;
        },
      },
      {
        accessorKey: "views",
        meta: { label: "Views" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Views" />
        ),
        cell: ({ row }) => (
          <span
            className={
              sortBy === "views"
                ? "font-semibold tabular-nums"
                : "tabular-nums"
            }
          >
            {row.original.views.toLocaleString("en-AU")}
          </span>
        ),
        sortingFn: (a, b) => a.original.views - b.original.views,
      },
      {
        accessorKey: "enquiries",
        meta: { label: "Enquiries" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Enquiries" />
        ),
        cell: ({ row }) => (
          <span
            className={
              sortBy === "enquiries"
                ? "font-semibold tabular-nums"
                : "tabular-nums"
            }
          >
            {row.original.enquiries}
          </span>
        ),
        sortingFn: (a, b) => a.original.enquiries - b.original.enquiries,
      },
    ],
    [sortBy],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumnId={["title", "agencyName"]}
      searchPlaceholder="Search by listing or agency..."
      facetedFilters={[
        { columnId: "tier", title: "Tier", options: TIER_OPTIONS },
      ]}
      defaultPageSize={10}
      initialSorting={[{ id: sortBy, desc: true }]}
    />
  );
}
