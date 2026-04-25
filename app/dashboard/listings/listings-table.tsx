"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Listing, ListingStatus, ListingTier } from "@/lib/types/listings";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import type { Paginated } from "@/lib/types/pagination";
import { TierBadge } from "@/components/shared/tier-badge";
import {
  updateListingStatus,
  deleteListing,
} from "@/lib/actions/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  FeaturedBadge,
  isListingFeaturedAnywhere,
} from "@/components/listings/featured-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Delete02Icon,
  Edit02Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  SentIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
  { value: "unpublished", label: "Unpublished" },
];

const ALLOWED_NEXT: Record<ListingStatus, ListingStatus[]> = {
  draft: ["published", "unpublished"],
  published: ["under_offer", "unpublished"],
  under_offer: ["published", "sold"],
  sold: [],
  unpublished: ["published"],
};

const TIER_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "featured", label: "Featured" },
];

function formatPrice(listing: Listing): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return "Not set";
}

type Props = {
  result: Paginated<Listing>;
  brokerSlug?: string;
  isAgencyOwner?: boolean;
  canFeature?: boolean;
};

export function ListingsTable({
  result,
  brokerSlug,
  isAgencyOwner,
  canFeature,
}: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { state, setPage, setPageSize, setSearch } = useTableUrlState();
  const [searchInput, setSearchInput] = React.useState(state.q);
  const [isPending, startTransition] = React.useTransition();
  React.useEffect(() => setSearchInput(state.q), [state.q]);
  const listings = result.rows;

  async function onStatusChange(listingId: string, newStatus: ListingStatus) {
    const res = await updateListingStatus(listingId, newStatus);
    if (res.ok) {
      toast.success("Status updated");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to update status");
    }
  }

  async function onConfirmDelete(listingId: string) {
    const res = await deleteListing(listingId);
    setDeletingId(null);
    if (res.ok) {
      toast.success("Listing deleted");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to delete");
    }
  }

  const columns = useMemo<ColumnDef<Listing>[]>(() => {
    const cols: ColumnDef<Listing>[] = [
      {
        id: "image",
        header: () => <span className="sr-only">Image</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const thumb = row.original.listing_images?.[0]?.url;
          return (
            <div className="relative h-12 w-16 overflow-hidden rounded border bg-muted">
              {thumb ? (
                <Image
                  src={thumb}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No image
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        meta: { label: "Title" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate max-w-[260px]">
              {row.original.title}
            </span>
            {isListingFeaturedAnywhere(row.original) && (
              <FeaturedBadge size="sm" />
            )}
          </div>
        ),
      },
    ];

    if (isAgencyOwner) {
      cols.push({
        id: "broker",
        accessorFn: (row) => row.broker?.name ?? "",
        meta: { label: "Broker" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Broker" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.broker?.name ?? "Not assigned"}
          </span>
        ),
      });
    }

    cols.push(
      {
        accessorKey: "status",
        meta: { label: "Status" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const listing = row.original;
          const nextStatuses = ALLOWED_NEXT[listing.status as ListingStatus] ?? [];
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={
                  listing.status === "published"
                    ? "success"
                    : listing.status === "sold"
                      ? "destructive"
                      : listing.status === "draft" ||
                          listing.status === "under_offer"
                        ? "warning"
                        : "outline"
                }
                className="shrink-0 capitalize border-0"
              >
                {listing.status.replace("_", " ")}
              </Badge>
              <Select
                value={listing.status}
                onValueChange={(v) =>
                  onStatusChange(listing.id, v as ListingStatus)
                }
              >
                <SelectTrigger className="h-8 w-[120px] sm:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter(
                    (opt) =>
                      opt.value === listing.status ||
                      nextStatuses.includes(opt.value)
                  ).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        accessorKey: "listing_tier",
        meta: { label: "Tier" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tier" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <TierBadge tier={(row.original.listing_tier as ListingTier) ?? "basic"} />
            {row.original.listing_tier !== "basic" &&
              !row.original.tier_paid_at && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  {row.original.status === "draft" ? "Unpaid" : "Payment pending"}
                </span>
              )}
          </div>
        ),
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
      },
      {
        id: "category",
        accessorFn: (row) => row.category?.name ?? "",
        meta: { label: "Category" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.category?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "asking_price",
        meta: { label: "Price" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Price" />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatPrice(row.original)}
          </span>
        ),
        sortingFn: (a, b) =>
          (Number(a.original.asking_price) || 0) -
          (Number(b.original.asking_price) || 0),
      },
      {
        accessorKey: "created_at",
        meta: { label: "Created" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) => {
          const listing = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      className="size-4"
                    />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/listings/${listing.id}/edit`}>
                      <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  {listing.status === "published" && brokerSlug && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/listing/${listing.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          className="size-4"
                        />
                        View public
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {listing.status === "published" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/listings/${listing.id}/share`}>
                        <HugeiconsIcon icon={SentIcon} className="size-4" />
                        Share with contacts
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {listing.status === "published" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/dashboard/listings/${listing.id}/share-external`}
                      >
                        <HugeiconsIcon icon={Mail01Icon} className="size-4" />
                        Send to new email
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canFeature && listing.status === "published" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/listings/${listing.id}/feature`}>
                        <HugeiconsIcon icon={StarIcon} className="size-4" />
                        {isListingFeaturedAnywhere(listing)
                          ? "Extend featured"
                          : "Feature this listing"}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setDeletingId(listing.id);
                    }}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }
    );

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgencyOwner, brokerSlug, canFeature]);

  if (result.total === 0 && !state.q && !state.filters.status) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 px-4 py-12 sm:py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <HugeiconsIcon icon={Edit02Icon} className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">No listings yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Create your first listing to start showcasing businesses to buyers.
        </p>
        <Button asChild>
          <Link href="/dashboard/listings/new">Add your first listing</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={listings}
        searchColumnId={["title", "category", ...(isAgencyOwner ? ["broker"] : [])]}
        searchPlaceholder={
          isAgencyOwner
            ? "Search by title, category or broker…"
            : "Search by title or category…"
        }
        searchValue={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          startTransition(() => setSearch(v));
        }}
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

      {deletingId && (
        <AlertDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The listing and its images will be
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deletingId) await onConfirmDelete(deletingId);
                }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
