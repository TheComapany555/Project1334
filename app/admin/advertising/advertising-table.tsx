"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Advertisement } from "@/lib/types/advertising";
import { toggleAdStatus, deleteAd } from "@/lib/actions/admin-advertising";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [placementFilter, setPlacementFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = ads;
    if (statusFilter !== "all") {
      if (statusFilter === "expired") {
        result = result.filter((a) => isExpired(a));
      } else {
        result = result.filter((a) => a.status === statusFilter && !isExpired(a));
      }
    }
    if (placementFilter !== "all") {
      result = result.filter((a) => a.placement === placementFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    return result;
  }, [ads, statusFilter, placementFilter, search]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center px-4 pt-4 pb-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={placementFilter} onValueChange={setPlacementFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Placement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All placements</SelectItem>
            <SelectItem value="homepage">Homepage</SelectItem>
            <SelectItem value="search">Search results</SelectItem>
            <SelectItem value="listing">Listing page</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground">{filtered.length} of {ads.length} ads</p>
      </div>
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
          {filtered.map((ad) => {
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
