"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Listing, ListingStatus, ListingTier } from "@/lib/types/listings";
import { TierBadge } from "@/components/shared/tier-badge";
import {
  updateListingStatus,
  deleteListing,
} from "@/lib/actions/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeaturedBadge, isFeaturedNow } from "@/components/listings/featured-badge";
import { UpgradeModal } from "@/components/listings/upgrade-modal";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Delete02Icon,
  Edit02Icon,
  MoreHorizontalIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";

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

function formatPrice(listing: Listing): string {
  if (listing.price_type === "poa") return "POA";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return "—";
}

type Props = { listings: Listing[]; brokerSlug?: string; isAgencyOwner?: boolean; canFeature?: boolean };

export function ListingsTable({ listings, brokerSlug, isAgencyOwner, canFeature }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [upgradeListing, setUpgradeListing] = useState<{ id: string; title: string } | null>(null);

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

  if (listings.length === 0) {
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead>Title</TableHead>
            {isAgencyOwner && <TableHead>Broker</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => {
            const thumb = listing.listing_images?.[0]?.url;
            const nextStatuses = ALLOWED_NEXT[listing.status as ListingStatus] ?? [];
            return (
              <TableRow key={listing.id}>
                <TableCell>
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
                        —
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{listing.title}</span>
                    {isFeaturedNow(listing.featured_until) && <FeaturedBadge size="sm" />}
                  </div>
                </TableCell>
                {isAgencyOwner && (
                  <TableCell className="text-sm text-muted-foreground">
                    {listing.broker?.name ?? "—"}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        listing.status === "published"
                          ? "success"
                          : listing.status === "sold"
                            ? "destructive"
                            : listing.status === "draft" || listing.status === "under_offer"
                              ? "warning"
                              : "outline"
                      }
                      className="shrink-0 capitalize border-0"
                    >
                      {listing.status.replace("_", " ")}
                    </Badge>
                    <Select
                      value={listing.status}
                      onValueChange={(v) => onStatusChange(listing.id, v as ListingStatus)}
                    >
                      <SelectTrigger className="h-8 w-[120px] sm:w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter((opt) =>
                          opt.value === listing.status || nextStatuses.includes(opt.value)
                        ).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <TierBadge tier={(listing.listing_tier as ListingTier) ?? "basic"} />
                    {listing.status === "draft" && listing.listing_tier !== "basic" && !listing.tier_paid_at && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">Unpaid</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {listing.category?.name ?? "—"}
                </TableCell>
                <TableCell>{formatPrice(listing)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {listing.created_at
                    ? new Date(listing.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
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
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                            View public
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {canFeature && listing.status === "published" && !isFeaturedNow(listing.featured_until) && (
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setUpgradeListing({ id: listing.id, title: listing.title });
                          }}
                        >
                          <HugeiconsIcon icon={StarIcon} className="size-4" />
                          Upgrade to Featured
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {deletingId && (
        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The listing and its images will be removed.
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

      {upgradeListing && (
        <UpgradeModal
          listingId={upgradeListing.id}
          listingTitle={upgradeListing.title}
          open={!!upgradeListing}
          onOpenChange={(open) => !open && setUpgradeListing(null)}
        />
      )}
    </>
  );
}
