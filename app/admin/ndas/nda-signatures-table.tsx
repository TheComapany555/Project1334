"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { type AdminNdaSignature } from "@/lib/actions/nda";
import {
  FileSignature,
  ShieldCheck,
  FileText,
  TrendingUp,
  ExternalLink,
  Eye,
} from "lucide-react";

type Props = {
  signatures: AdminNdaSignature[];
  stats: {
    totalSignatures: number;
    listingsWithNda: number;
    recentSignatures: number;
  };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NdaSignaturesTable({ signatures, stats }: Props) {
  const [previewSig, setPreviewSig] = useState<AdminNdaSignature | null>(null);

  const columns = useMemo<ColumnDef<AdminNdaSignature>[]>(
    () => [
      {
        id: "signer",
        accessorFn: (row) => `${row.signer_name} ${row.signer_email}`,
        meta: { label: "Signer" },
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Signer" />
        ),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium leading-tight">
              {row.original.signer_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {row.original.signer_email}
            </p>
          </div>
        ),
      },
      {
        id: "listing",
        accessorFn: (row) => row.listing?.title ?? "",
        meta: { label: "Listing" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Listing" />
        ),
        cell: ({ row }) =>
          row.original.listing ? (
            <Link
              href={`/listing/${row.original.listing.slug}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              target="_blank"
            >
              {row.original.listing.title}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">No listing</span>
          ),
      },
      {
        accessorKey: "signed_at",
        meta: { label: "Signed" },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Signed" />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-[10px]">
            {formatDate(row.original.signed_at)}
          </Badge>
        ),
        sortingFn: (a, b) =>
          new Date(a.original.signed_at).getTime() -
          new Date(b.original.signed_at).getTime(),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableHiding: false,
        cell: ({ row }) =>
          row.original.signature_data ? (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewSig(row.original)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No signature</span>
          ),
      },
    ],
    []
  );

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
            All NDA Signatures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={signatures}
            searchColumnId={["signer", "listing"]}
            searchPlaceholder="Search by signer or listing…"
            initialSorting={[{ id: "signed_at", desc: true }]}
            defaultPageSize={20}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!previewSig}
        onOpenChange={(open) => !open && setPreviewSig(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Digital signature</DialogTitle>
            <DialogDescription>
              Signed by {previewSig?.signer_name} on{" "}
              {previewSig ? formatDate(previewSig.signed_at) : ""}
            </DialogDescription>
          </DialogHeader>
          {previewSig?.signature_data && (
            <div className="rounded border border-border bg-white dark:bg-muted/20 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSig.signature_data}
                alt={`Signature of ${previewSig.signer_name}`}
                className="max-h-32 w-auto mx-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
