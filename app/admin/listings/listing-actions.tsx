"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminRemoveListing, adminRestoreListing } from "@/lib/actions/admin-listings";

type Props = { listingId: string; slug: string; isRemoved: boolean };

export function ListingActions({ listingId, slug, isRemoved }: Props) {
  const router = useRouter();

  async function handleRemove() {
    const result = await adminRemoveListing(listingId);
    if (result.ok) {
      toast.success("Listing removed from marketplace.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to remove.");
    }
  }

  async function handleRestore() {
    const result = await adminRestoreListing(listingId);
    if (result.ok) {
      toast.success("Listing restored to marketplace.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to restore.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/listing/${slug}`} target="_blank" rel="noopener noreferrer">
          View
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isRemoved ? (
            <DropdownMenuItem onClick={handleRestore}>
              Restore to marketplace
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-destructive focus:text-destructive"
            >
              Remove from marketplace
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
