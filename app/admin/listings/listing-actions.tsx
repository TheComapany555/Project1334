"use client";

import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminRemoveListing, adminRestoreListing } from "@/lib/actions/admin-listings";
import { Loader2 } from "lucide-react";

type Props = { listingId: string; slug: string; isRemoved: boolean };

export function ListingActions({ listingId, slug, isRemoved }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const result = await adminRemoveListing(listingId);
    setLoading(false);
    if (result.ok) {
      toast.success("Listing removed from marketplace.");
      setConfirmOpen(false);
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
    <>
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
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                Remove from marketplace
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the listing from the public marketplace. The
              broker will still see it in their dashboard. You can restore it
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove listing"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
