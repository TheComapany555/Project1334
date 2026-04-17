"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Product } from "@/lib/types/products";
import { FEATURED_SCOPE_LABELS } from "@/lib/types/products";
import { toggleProductStatus } from "@/lib/actions/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatDate } from "@/lib/utils";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type ProductWithCategory = Product & { category?: { id: string; name: string } | null };

const TYPE_OPTIONS = [
  { value: "featured", label: "Featured upgrade" },
  { value: "listing_tier", label: "Listing visibility" },
  { value: "subscription", label: "Subscription" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function ProductsTable({ products }: { products: ProductWithCategory[] }) {
  const router = useRouter();

  async function handleToggle(id: string) {
    const res = await toggleProductStatus(id);
    if (res.ok) {
      toast.success("Status updated");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update");
    }
  }

  const columns = useMemo<ColumnDef<ProductWithCategory>[]>(
    () => [
      {
        accessorKey: "name",
        meta: { label: "Name" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        enableHiding: false,
        cell: ({ row }) => (
          <div>
            <p className="font-medium leading-tight">{row.original.name}</p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px] truncate">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "product_type",
        meta: { label: "Type" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {row.original.product_type.replace("_", " ")}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        id: "scope",
        accessorFn: (row) => row.scope ?? "",
        meta: { label: "Scope" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Scope" />
        ),
        cell: ({ row }) => {
          const isFeatured = row.original.product_type === "featured";
          if (!isFeatured || !row.original.scope) {
            return <span className="text-xs text-muted-foreground">N/A</span>;
          }
          return (
            <Badge variant="secondary" className="text-xs">
              {FEATURED_SCOPE_LABELS[row.original.scope]}
            </Badge>
          );
        },
      },
      {
        id: "category",
        accessorFn: (row) => row.category?.name ?? "",
        meta: { label: "Category" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          const isFeatured = row.original.product_type === "featured";
          if (!isFeatured) {
            return <span className="text-xs text-muted-foreground">N/A</span>;
          }
          if (row.original.category?.name) {
            return <span className="text-sm">{row.original.category.name}</span>;
          }
          if (row.original.scope === "homepage") {
            return <span className="text-xs text-muted-foreground">N/A</span>;
          }
          return (
            <span className="text-xs text-muted-foreground italic">
              All categories
            </span>
          );
        },
      },
      {
        accessorKey: "price",
        meta: { label: "Price" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Price" />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatPrice(row.original.price, row.original.currency)}
          </span>
        ),
        sortingFn: (a, b) => a.original.price - b.original.price,
      },
      {
        accessorKey: "duration_days",
        meta: { label: "Duration" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Duration" />
        ),
        cell: ({ row }) => {
          const days = row.original.duration_days;
          if (!days) {
            return <span className="text-sm text-muted-foreground">N/A</span>;
          }
          return (
            <Badge variant="outline" className="text-xs">
              {days} days
            </Badge>
          );
        },
        sortingFn: (a, b) =>
          (a.original.duration_days ?? 0) - (b.original.duration_days ?? 0),
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "active" ? "success" : "secondary"}
            className="border-0 capitalize"
          >
            {row.original.status}
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
              <Link href={`/admin/products/${row.original.id}/edit`}>Edit</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(row.original.id)}
            >
              {row.original.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={products}
        searchColumnId="name"
        searchPlaceholder="Search plans by name…"
        facetedFilters={[
          { columnId: "product_type", title: "Type", options: TYPE_OPTIONS },
          { columnId: "status", title: "Status", options: STATUS_OPTIONS },
        ]}
        defaultPageSize={10}
        initialSorting={[{ id: "created_at", desc: true }]}
      />
    </div>
  );
}
