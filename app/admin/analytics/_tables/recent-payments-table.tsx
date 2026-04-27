"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { RecentPayment } from "@/lib/types/admin-analytics";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusPill } from "@/components/admin/analytics/status-pill";
import { formatCurrencyAUD } from "@/lib/utils/format";

const STATUS_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "invoiced", label: "Invoiced" },
  { value: "approved", label: "Approved" },
];

export function RecentPaymentsTable({ data }: { data: RecentPayment[] }) {
  const columns = useMemo<ColumnDef<RecentPayment>[]>(
    () => [
      {
        accessorKey: "brokerName",
        meta: { label: "Broker" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Broker / Agency" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-0.5 max-w-[260px]">
            <p className="font-medium leading-tight truncate">
              {row.original.brokerName ?? "Unknown"}
            </p>
            {row.original.agencyName && (
              <p className="text-xs text-muted-foreground truncate">
                {row.original.agencyName}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "productName",
        meta: { label: "Product" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Product" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.productName ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        meta: { label: "Amount" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatCurrencyAUD(row.original.amount)}
          </span>
        ),
        sortingFn: (a, b) => a.original.amount - b.original.amount,
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <StatusPill status={row.original.status} />,
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
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
      searchColumnId={["brokerName", "productName"]}
      searchPlaceholder="Search broker or product..."
      facetedFilters={[
        { columnId: "status", title: "Status", options: STATUS_OPTIONS },
      ]}
      defaultPageSize={10}
      initialSorting={[{ id: "createdAt", desc: true }]}
    />
  );
}
