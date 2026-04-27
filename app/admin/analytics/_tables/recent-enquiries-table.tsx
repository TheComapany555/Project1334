"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { RecentEnquiry } from "@/lib/types/admin-analytics";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

export function RecentEnquiriesTable({ data }: { data: RecentEnquiry[] }) {
  const columns = useMemo<ColumnDef<RecentEnquiry>[]>(
    () => [
      {
        accessorKey: "contactName",
        meta: { label: "Contact" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contact" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[260px]">
            <p className="font-medium leading-tight truncate">
              {row.original.contactName ?? "Anonymous"}
            </p>
            {row.original.contactEmail && (
              <p className="text-xs text-muted-foreground truncate">
                {row.original.contactEmail}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "listingTitle",
        meta: { label: "Listing" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listing" />
        ),
        cell: ({ row }) => (
          <span className="text-sm truncate max-w-[280px] block">
            {row.original.listingTitle ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        meta: { label: "When" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="When" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {formatDistanceToNow(new Date(row.original.createdAt), {
              addSuffix: true,
            })}
          </span>
        ),
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() -
          new Date(b.original.createdAt).getTime(),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumnId={["contactName", "contactEmail", "listingTitle"]}
      searchPlaceholder="Search contact or listing..."
      defaultPageSize={10}
      initialSorting={[{ id: "createdAt", desc: true }]}
    />
  );
}
