"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TopCategory } from "@/lib/types/admin-analytics";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

export function TopCategoriesTable({ data }: { data: TopCategory[] }) {
  const columns = useMemo<ColumnDef<TopCategory>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Category" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "listings",
        meta: { label: "Listings" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listings" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {row.original.listings}
          </span>
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
          <span className="tabular-nums">{row.original.enquiries}</span>
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
      searchColumnId="name"
      searchPlaceholder="Search categories..."
      defaultPageSize={10}
      initialSorting={[{ id: "listings", desc: true }]}
    />
  );
}
