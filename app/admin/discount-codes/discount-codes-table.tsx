"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { DiscountCode } from "@/lib/types/discount-codes";
import {
  toggleDiscountCodeActive,
  deleteDiscountCode,
} from "@/lib/actions/discount-codes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function expiryLabel(code: DiscountCode): string {
  if (!code.valid_until) return "No expiry";
  const expiry = new Date(code.valid_until);
  const now = new Date();
  if (expiry < now) return "Expired";
  return formatDate(code.valid_until);
}

export function DiscountCodesTable({ codes }: { codes: DiscountCode[] }) {
  const router = useRouter();

  const handleToggle = useCallback(
    async (id: string) => {
      const res = await toggleDiscountCodeActive(id);
      if (res.ok) {
        toast.success("Status updated");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to update");
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string, code: string) => {
      if (
        !window.confirm(
          `Delete code "${code}"? This can't be undone. Existing payments tied to this code stay intact.`
        )
      ) {
        return;
      }
      const res = await deleteDiscountCode(id);
      if (res.ok) {
        toast.success("Code deleted");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to delete");
      }
    },
    [router]
  );

  const columns = useMemo<ColumnDef<DiscountCode>[]>(
    () => [
      {
        accessorKey: "code",
        meta: { label: "Code" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div>
            <p className="font-mono font-semibold text-sm leading-tight">
              {row.original.code}
            </p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px] truncate">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "percent_off",
        meta: { label: "Discount" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Discount" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.percent_off === 100 ? "success" : "outline"}
            className="text-xs"
          >
            {row.original.percent_off}% off
          </Badge>
        ),
        sortingFn: (a, b) => a.original.percent_off - b.original.percent_off,
      },
      {
        id: "usage",
        accessorFn: (row) => row.used_count,
        meta: { label: "Usage" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Usage" />
        ),
        cell: ({ row }) => {
          const max = row.original.max_uses;
          return (
            <span className="text-sm tabular-nums">
              {row.original.used_count}
              {max != null && (
                <span className="text-muted-foreground"> / {max}</span>
              )}
              {max == null && (
                <span className="text-muted-foreground text-xs"> (unlimited)</span>
              )}
            </span>
          );
        },
      },
      {
        id: "expiry",
        accessorFn: (row) => row.valid_until ?? "",
        meta: { label: "Expires" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Expires" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {expiryLabel(row.original)}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.active ? "active" : "inactive"),
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.active ? "success" : "secondary"}
            className="border-0 capitalize"
          >
            {row.original.active ? "Active" : "Inactive"}
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
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/discount-codes/${row.original.id}/edit`}>
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(row.original.id)}
            >
              {row.original.active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row.original.id, row.original.code)}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [handleToggle, handleDelete]
  );

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={codes}
        searchColumnId="code"
        searchPlaceholder="Search by code…"
        facetedFilters={[
          { columnId: "status", title: "Status", options: STATUS_OPTIONS },
        ]}
        defaultPageSize={10}
        initialSorting={[{ id: "created_at", desc: true }]}
      />
    </div>
  );
}
