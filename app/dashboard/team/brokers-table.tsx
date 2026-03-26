"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Search, Pencil } from "lucide-react";
import { RemoveBrokerButton } from "./invitation-actions";

type Broker = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  agency_role: "owner" | "member";
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function BrokersTable({ brokers }: { brokers: Broker[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return brokers;
    const q = search.toLowerCase();
    return brokers.filter((b) =>
      b.name?.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q)
    );
  }, [brokers, search]);

  return (
    <>
      {brokers.length > 3 && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search brokers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Broker</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[160px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No brokers found.</TableCell></TableRow>
          ) : filtered.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar name={b.name} email={b.email} photoUrl={b.photo_url} />
                  <span className="font-medium">{b.name ?? "—"}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{b.email}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{b.phone ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={b.agency_role === "owner" ? "default" : "secondary"}>
                  {b.agency_role === "owner" ? "Owner" : "Member"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDate(b.created_at)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" asChild>
                    <Link href={`/dashboard/team/${b.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  {b.agency_role !== "owner" && (
                    <RemoveBrokerButton brokerId={b.id} brokerName={b.name} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
