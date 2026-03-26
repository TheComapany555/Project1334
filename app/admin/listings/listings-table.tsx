"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { FeaturedBadge, isFeaturedNow } from "@/components/listings/featured-badge";
import { ListingActions } from "./listing-actions";
import { Search } from "lucide-react";

type AdminListing = {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_featured: boolean;
  featured_until: string | null;
  admin_removed_at: string | null;
  created_at: string;
  broker?: { name: string | null; company: string | null } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminListingsTable({ listings }: { listings: AdminListing[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = listings;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (visibilityFilter === "removed") {
      result = result.filter((l) => !!l.admin_removed_at);
    } else if (visibilityFilter === "visible") {
      result = result.filter((l) => !l.admin_removed_at);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.broker?.name?.toLowerCase().includes(q) ||
        l.broker?.company?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, statusFilter, visibilityFilter, search]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center px-4 pt-4 pb-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="under_offer">Under offer</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Visibility" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visibility</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground">{filtered.length} of {listings.length} listings</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Broker</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[180px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No listings found.</TableCell></TableRow>
          ) : filtered.map((l) => {
            const isRemoved = !!l.admin_removed_at;
            return (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.broker?.name ?? l.broker?.company ?? "—"}</TableCell>
                <TableCell><StatusBadge status={l.status} className="border-0" /></TableCell>
                <TableCell><StatusBadge status={isRemoved ? "removed" : "active"} label={isRemoved ? "Removed" : "Visible"} className="border-0" /></TableCell>
                <TableCell>{isFeaturedNow(l.featured_until) ? <FeaturedBadge size="sm" /> : <Badge variant="outline" className="text-xs border-0">—</Badge>}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(l.created_at)}</TableCell>
                <TableCell><ListingActions listingId={l.id} slug={l.slug} isRemoved={isRemoved} isFeatured={l.is_featured} featuredUntil={l.featured_until} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
