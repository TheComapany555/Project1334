"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TopAgency } from "@/lib/types/admin-analytics";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatCurrencyAUD } from "@/lib/utils/format";

export function TopAgenciesTable({ data }: { data: TopAgency[] }) {
  const columns = useMemo<ColumnDef<TopAgency>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Agency" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Agency" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "brokers",
        meta: { label: "Brokers" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Brokers" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.brokers}</span>
        ),
        sortingFn: (a, b) => a.original.brokers - b.original.brokers,
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
        accessorKey: "revenue",
        meta: { label: "Revenue" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Revenue" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatCurrencyAUD(row.original.revenue)}
          </span>
        ),
        sortingFn: (a, b) => a.original.revenue - b.original.revenue,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumnId="name"
      searchPlaceholder="Search agencies..."
      defaultPageSize={10}
      initialSorting={[{ id: "revenue", desc: true }]}
    />
  );
}
