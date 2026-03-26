"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { AgencyActions } from "./agency-actions";
import { Search } from "lucide-react";

type Agency = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  broker_count: number;
  listing_count: number;
  owner_name: string | null;
  owner_email: string;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function AgenciesTable({ agencies }: { agencies: Agency[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = agencies;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.owner_name?.toLowerCase().includes(q) ||
        a.owner_email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [agencies, statusFilter, search]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center px-4 pt-4 pb-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search agencies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground">{filtered.length} of {agencies.length} agencies</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agency</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-center">Brokers</TableHead>
            <TableHead className="text-center">Listings</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No agencies found.</TableCell></TableRow>
          ) : filtered.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{a.name}</p>
                  {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm">{a.owner_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.owner_email}</p>
                </div>
              </TableCell>
              <TableCell className="text-center">{a.broker_count}</TableCell>
              <TableCell className="text-center">{a.listing_count}</TableCell>
              <TableCell><StatusBadge status={a.status} className="border-0" /></TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDate(a.created_at)}</TableCell>
              <TableCell><AgencyActions agencyId={a.id} status={a.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
