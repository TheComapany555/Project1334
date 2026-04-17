"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Advertisement } from "@/lib/types/advertising";
import { toggleAdStatus, deleteAd } from "@/lib/actions/admin-advertising";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";

const PLACEMENT_LABELS: Record<string, string> = {
  homepage: "Homepage",
  search: "Search results",
  listing: "Listing page",
};

const PLACEMENT_OPTIONS = [
  { value: "homepage", label: "Homepage" },
  { value: "search", label: "Search results" },
  { value: "listing", label: "Listing page" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
];

function isExpired(ad: Advertisement): boolean {
  return !!ad.end_date && new Date(ad.end_date) < new Date();
}

function effectiveStatus(ad: Advertisement): string {
  return isExpired(ad) ? "expired" : ad.status;
}

export function AdvertisingTable({ ads }: { ads: Advertisement[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleToggle(id: string) {
    const res = await toggleAdStatus(id);
    if (res.ok) {
      toast.success("Ad status updated");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update");
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    const res = await deleteAd(deletingId);
    setDeletingId(null);
    if (res.ok) {
      toast.success("Ad deleted");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to delete");
    }
  }

  const columns = useMemo<ColumnDef<Advertisement>[]>(
    () => [
      {
        accessorKey: "title",
        meta: { label: "Title" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => (
          <span
            className={
              isExpired(row.original)
                ? "font-medium opacity-60 max-w-[220px] truncate inline-block"
                : "font-medium max-w-[220px] truncate inline-block"
            }
          >
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "placement",
        meta: { label: "Placement" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Placement" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {PLACEMENT_LABELS[row.original.placement] ?? row.original.placement}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        id: "status",
        accessorFn: (row) => effectiveStatus(row),
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const expired = isExpired(row.original);
          if (expired) {
            return (
              <Badge variant="secondary" className="border-0">
                Expired
              </Badge>
            );
          }
          return (
            <Badge
              variant={
                row.original.status === "active" ? "success" : "secondary"
              }
              className="border-0 capitalize"
            >
              {row.original.status}
            </Badge>
          );
        },
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        id: "schedule",
        meta: { label: "Schedule" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Schedule" />
        ),
        accessorFn: (row) => row.start_date,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            <span>{formatDate(row.original.start_date)}</span>
            {row.original.end_date ? (
              <>
                <span className="mx-1">→</span>
                <span>{formatDate(row.original.end_date)}</span>
              </>
            ) : (
              <span className="text-xs ml-1">(no expiry)</span>
            )}
          </span>
        ),
        sortingFn: (a, b) =>
          new Date(a.original.start_date).getTime() -
          new Date(b.original.start_date).getTime(),
      },
      {
        accessorKey: "impression_count",
        meta: { label: "Impressions" },
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Impressions" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {row.original.impression_count.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "click_count",
        meta: { label: "Clicks" },
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Clicks" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {row.original.click_count.toLocaleString()}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/advertising/${row.original.id}/edit`}>
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(row.original.id)}
            >
              {row.original.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletingId(row.original.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <div className="px-4 pb-4">
        <DataTable
          columns={columns}
          data={ads}
          searchColumnId="title"
          searchPlaceholder="Search ads by title…"
          facetedFilters={[
            {
              columnId: "placement",
              title: "Placement",
              options: PLACEMENT_OPTIONS,
            },
            { columnId: "status", title: "Status", options: STATUS_OPTIONS },
          ]}
          initialSorting={[{ id: "schedule", desc: true }]}
        />
      </div>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete advertisement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the ad. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
