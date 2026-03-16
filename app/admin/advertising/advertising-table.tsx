"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Advertisement } from "@/lib/types/advertising";
import { toggleAdStatus, deleteAd } from "@/lib/actions/admin-advertising";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/utils";

const PLACEMENT_LABELS: Record<string, string> = {
  homepage: "Homepage",
  search: "Search results",
  listing: "Listing page",
};

function isExpired(ad: Advertisement): boolean {
  return !!ad.end_date && new Date(ad.end_date) < new Date();
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map((ad) => {
            const expired = isExpired(ad);
            return (
              <TableRow key={ad.id} className={expired ? "opacity-60" : ""}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {ad.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {PLACEMENT_LABELS[ad.placement] ?? ad.placement}
                  </Badge>
                </TableCell>
                <TableCell>
                  {expired ? (
                    <Badge variant="secondary" className="border-0">
                      Expired
                    </Badge>
                  ) : (
                    <Badge
                      variant={
                        ad.status === "active" ? "success" : "secondary"
                      }
                      className="border-0 capitalize"
                    >
                      {ad.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <span>{formatDate(ad.start_date)}</span>
                  {ad.end_date && (
                    <>
                      <span className="mx-1">→</span>
                      <span>{formatDate(ad.end_date)}</span>
                    </>
                  )}
                  {!ad.end_date && (
                    <span className="text-xs ml-1">(no expiry)</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {ad.impression_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {ad.click_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/advertising/${ad.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(ad.id)}
                    >
                      {ad.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(ad.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
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
