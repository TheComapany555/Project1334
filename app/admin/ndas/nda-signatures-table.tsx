"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAllNdaSignatures,
  type AdminNdaSignature,
} from "@/lib/actions/nda";
import {
  FileSignature,
  ShieldCheck,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";

type Props = {
  initialSignatures: AdminNdaSignature[];
  initialTotal: number;
  stats: {
    totalSignatures: number;
    listingsWithNda: number;
    recentSignatures: number;
  };
};

const PAGE_SIZE = 20;

export function NdaSignaturesTable({
  initialSignatures,
  initialTotal,
  stats,
}: Props) {
  const [signatures, setSignatures] = useState(initialSignatures);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadPage = async (p: number) => {
    setLoading(true);
    const result = await getAllNdaSignatures({ page: p, pageSize: PAGE_SIZE });
    setSignatures(result.signatures);
    setTotal(result.total);
    setPage(p);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSignatures}</p>
              <p className="text-xs text-muted-foreground">Total Signatures</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.listingsWithNda}</p>
              <p className="text-xs text-muted-foreground">
                Listings with NDA
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.recentSignatures}</p>
              <p className="text-xs text-muted-foreground">
                Signed This Week
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            All NDA Signatures ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No NDA signatures yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signer</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead className="w-24">Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatures.map((sig) => (
                  <TableRow key={sig.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{sig.signer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sig.signer_email}
                      </p>
                    </TableCell>
                    <TableCell>
                      {sig.listing ? (
                        <Link
                          href={`/listing/${sig.listing.slug}`}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          target="_blank"
                        >
                          {sig.listing.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {new Date(sig.signed_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(
                            expandedId === sig.id ? null : sig.id
                          )
                        }
                      >
                        {expandedId === sig.id ? (
                          <EyeOff className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 mr-1" />
                        )}
                        {expandedId === sig.id ? "Hide" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Expanded signature rows */}
                {signatures.map(
                  (sig) =>
                    expandedId === sig.id &&
                    sig.signature_data && (
                      <TableRow key={`sig-${sig.id}`}>
                        <TableCell colSpan={4} className="bg-muted/30">
                          <div className="py-2">
                            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                              Digital Signature — {sig.signer_name}
                            </p>
                            <div className="rounded border border-border bg-white dark:bg-muted/20 p-2 inline-block">
                              <img
                                src={sig.signature_data}
                                alt={`Signature of ${sig.signer_name}`}
                                className="max-h-20 w-auto"
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => loadPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => loadPage(page + 1)}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
