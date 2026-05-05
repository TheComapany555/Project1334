"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveBuyerDocumentAccess,
  rejectBuyerDocumentAccess,
  type BrokerDocumentAccessRequestRow,
} from "@/lib/actions/documents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSignature, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function DocumentAccessClient({
  initialPending,
}: {
  initialPending: BrokerDocumentAccessRequestRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const empty = pending.length === 0;

  const sorted = useMemo(
    () => [...pending].sort((a, b) => b.requested_at.localeCompare(a.requested_at)),
    [pending]
  );

  async function approve(id: string) {
    setBusyId(id);
    const result = await approveBuyerDocumentAccess(id);
    setBusyId(null);
    if (result.ok) {
      setPending((p) => p.filter((row) => row.id !== id));
      toast.success("Access approved.");
      startTransition(() => router.refresh());
    } else toast.error(result.error);
  }

  async function deny(id: string) {
    setBusyId(id);
    const result = await rejectBuyerDocumentAccess(id, null);
    setBusyId(null);
    if (result.ok) {
      setPending((p) => p.filter((row) => row.id !== id));
      toast.success("Access denied.");
      startTransition(() => router.refresh());
    } else toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader className="border-b px-5 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              Confidential document requests
            </CardTitle>
            <CardDescription>
              Buyers who signed your listing NDAs appear here until you approve or deny access to each
              confidential file.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {empty ? (
          <div className="py-16 px-6 text-center text-sm text-muted-foreground">
            No pending document access requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/40">
                  <TableHead className="pl-5">Buyer</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-5 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {row.buyer_name || "Buyer"}
                        </span>
                        {row.buyer_email && (
                          <span className="text-xs text-muted-foreground break-all">
                            {row.buyer_email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top max-w-[200px]">
                      <Badge variant="secondary" className="text-[10px] font-normal truncate max-w-full">
                        {row.listing_title ?? "Listing"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm">{row.document_name ?? "Document"}</TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(row.requested_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="pr-5 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => approve(row.id)}
                          className="gap-1.5"
                        >
                          {busyId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => deny(row.id)}
                        >
                          Deny
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
