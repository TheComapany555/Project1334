"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TopBroker } from "@/lib/types/admin-analytics";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

export function TopBrokersTable({ data }: { data: TopBroker[] }) {
  const columns = useMemo<ColumnDef<TopBroker>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Broker" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Broker" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[260px]">
            <p className="font-medium leading-tight truncate">
              {row.original.name ?? row.original.email}
            </p>
            {row.original.name && (
              <p className="text-xs text-muted-foreground truncate">
                {row.original.email}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "agencyName",
        meta: { label: "Agency" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Agency" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block">
            {row.original.agencyName ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "listings",
        meta: { label: "Listings" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listings" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.listings}</span>
        ),
        sortingFn: (a, b) => a.original.listings - b.original.listings,
      },
      {
        accessorKey: "enquiries",
        meta: { label: "Enquiries" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Enquiries" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {row.original.enquiries}
          </span>
        ),
        sortingFn: (a, b) => a.original.enquiries - b.original.enquiries,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumnId={["name", "email", "agencyName"]}
      searchPlaceholder="Search broker, email or agency..."
      defaultPageSize={10}
      initialSorting={[{ id: "enquiries", desc: true }]}
    />
  );
}
