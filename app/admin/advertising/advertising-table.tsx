"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { UrlFacetedFilter } from "@/components/ui/url-faceted-filter";
import type { Paginated } from "@/lib/types/pagination";

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
];

function isExpired(ad: Advertisement): boolean {
  return !!ad.end_date && new Date(ad.end_date) < new Date();
}

export function AdvertisingTable({ result }: { result: Paginated<Advertisement> }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { state, setPage, setPageSize, setSearch, setFilter } = useTableUrlState({
    filterKeys: ["status", "placement"],
  });
  const [searchInput, setSearchInput] = React.useState(state.q);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => setSearchInput(state.q), [state.q]);

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

  const columns = React.useMemo<ColumnDef<Advertisement>[]>(
    () => [
      {
        accessorKey: "title",
        meta: { label: "Title" },
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Placement" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {PLACEMENT_LABELS[row.original.placement] ?? row.original.placement}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
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
              variant={row.original.status === "active" ? "success" : "secondary"}
              className="border-0 capitalize"
            >
              {row.original.status}
            </Badge>
          );
        },
      },
      {
        id: "schedule",
        meta: { label: "Schedule" },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule" />,
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
              <Link href={`/admin/advertising/${row.original.id}/edit`}>Edit</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleToggle(row.original.id)}>
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
    [],
  );

  return (
    <>
      <div className="px-4 pb-4">
        <DataTable
          columns={columns}
          data={result.rows}
          searchColumnId="title"
          searchPlaceholder="Search ads by title…"
          searchValue={searchInput}
          onSearchChange={(v) => {
            setSearchInput(v);
            startTransition(() => setSearch(v));
          }}
          toolbarRight={
            <div className="flex flex-wrap items-center gap-2">
              <UrlFacetedFilter
                title="Placement"
                value={state.filters.placement}
                onChange={(v) => startTransition(() => setFilter("placement", v))}
                options={PLACEMENT_OPTIONS}
              />
              <UrlFacetedFilter
                title="Status"
                value={state.filters.status}
                onChange={(v) => startTransition(() => setFilter("status", v))}
                options={STATUS_OPTIONS}
              />
            </div>
          }
          serverPagination={{
            pageIndex: result.page - 1,
            pageSize: result.pageSize,
            total: result.total,
            isFetching: isPending,
            onPaginationChange: ({ pageIndex, pageSize }) => {
              startTransition(() => {
                if (pageSize !== result.pageSize) setPageSize(pageSize);
                else setPage(pageIndex + 1);
              });
            },
          }}
        />
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
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
