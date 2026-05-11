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
import type { NdaSignatureWithListing } from "@/lib/types/nda";
import {
  FileSignature,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
  Settings,
  UserCircle,
} from "lucide-react";
import { useBuyerPanelStore } from "@/lib/stores/buyer-panel-store";

type Props = {
  signatures: NdaSignatureWithListing[];
};

export function BrokerNdaList({ signatures }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const openBuyer = useBuyerPanelStore((s) => s.openBuyer);

  if (signatures.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">No NDA signatures yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When buyers sign NDAs on your listings, they will appear here.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            To set up an NDA, go to a listing → Edit → Document Vault & NDA →
            NDA Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by listing for summary
  const listingMap = new Map<string, { title: string; slug: string; count: number }>();
  for (const sig of signatures) {
    if (sig.listing) {
      const existing = listingMap.get(sig.listing.id);
      if (existing) {
        existing.count++;
      } else {
        listingMap.set(sig.listing.id, {
          title: sig.listing.title,
          slug: sig.listing.slug,
          count: 1,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{signatures.length}</p>
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
              <p className="text-2xl font-bold">{listingMap.size}</p>
              <p className="text-xs text-muted-foreground">
                Listings with Signed NDAs
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-listing breakdown */}
      {listingMap.size > 1 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(listingMap.entries()).map(([id, info]) => (
            <Badge key={id} variant="outline" className="gap-1.5 py-1">
              <Link
                href={`/dashboard/listings/${id}/nda`}
                className="hover:underline"
              >
                {info.title}
              </Link>
              <span className="text-primary font-semibold">{info.count}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All Signatures</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signer</TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signatures.map((sig) => (
                <TableRow key={sig.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => openBuyer(sig.user_id, sig.listing_id)}
                      className="text-left text-sm font-medium hover:underline underline-offset-2 inline-flex items-center gap-1"
                    >
                      <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      {sig.signer_name}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {sig.signer_email}
                    </p>
                  </TableCell>
                  <TableCell>
                    {sig.listing ? (
                      <div className="space-y-0.5">
                        <Link
                          href={`/listing/${sig.listing.slug}`}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          target="_blank"
                        >
                          {sig.listing.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <div>
                          <Link
                            href={`/dashboard/listings/${sig.listing.id}/nda`}
                            className="text-[10px] text-muted-foreground hover:underline inline-flex items-center gap-0.5"
                          >
                            <Settings className="h-2.5 w-2.5" />
                            NDA Settings
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
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
                        setExpandedId(expandedId === sig.id ? null : sig.id)
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
        </CardContent>
      </Card>
    </div>
  );
}
