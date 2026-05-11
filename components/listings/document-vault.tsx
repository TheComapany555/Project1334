"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NdaSignDialog } from "./nda-sign-dialog";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type ListingDocument,
} from "@/lib/types/documents";
import { recordDocumentEvent } from "@/lib/actions/documents";
import {
  FileText,
  Download,
  Lock,
  ShieldCheck,
  FolderOpen,
  Eye,
} from "lucide-react";

type Props = {
  listingId: string;
  documents: ListingDocument[];
  requiresNda: boolean;
  hasSigned: boolean;
  /** Confidential files hidden until NDA signed; titles are never shown when this is positive. */
  lockedConfidentialCount?: number;
  ndaText: string | null;
  isLoggedIn: boolean;
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentVault({
  listingId,
  documents,
  requiresNda,
  hasSigned,
  lockedConfidentialCount = 0,
  ndaText,
  isLoggedIn,
}: Props) {
  const [signedState, setSignedState] = useState(hasSigned);

  if (documents.length === 0 && lockedConfidentialCount === 0) return null;

  const publicDocs = documents.filter((d) => !d.is_confidential);
  const confidentialDocs = documents.filter((d) => d.is_confidential);
  const canAccessConfidential = !requiresNda || signedState;
  const unsignedConfidentialCount =
    requiresNda && !signedState ? lockedConfidentialCount : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Document Vault
        </CardTitle>
        <CardDescription>
          {requiresNda && !signedState
            ? "Some documents require an NDA to access"
            : "Documents related to this listing"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Public documents */}
        {publicDocs.length > 0 && (
          <div className="space-y-2">
            {publicDocs.map((doc) => (
              <DocumentRow key={doc.id} document={doc} canAccess />
            ))}
          </div>
        )}

        {/* Confidential section: hidden file names until NDA + broker approval */}
        {(confidentialDocs.length > 0 || unsignedConfidentialCount > 0) && (
          <div className="space-y-3">
            {publicDocs.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Confidential Documents
                </span>
              </div>
            )}

            {canAccessConfidential ? (
              <div className="space-y-2">
                {signedState && requiresNda && confidentialDocs.some((d) => !d.buyer_access_pending && d.file_url) && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 mb-3">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    NDA signed — confidential files the broker approved for you are available below.
                  </div>
                )}
                {signedState && requiresNda && confidentialDocs.some((d) => d.buyer_access_pending) && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 mb-2">
                    Some confidential files are awaiting the broker&apos;s approval. Titles stay hidden until then.
                  </div>
                )}
                {confidentialDocs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    canAccess={!doc.buyer_access_pending && !!doc.file_url}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 text-center space-y-3">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">
                    {unsignedConfidentialCount > 0
                      ? `${unsignedConfidentialCount} confidential document${unsignedConfidentialCount !== 1 ? "s" : ""} available`
                      : `${confidentialDocs.length} confidential document${confidentialDocs.length !== 1 ? "s" : ""} available`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sign the NDA to request access. File names stay hidden until the broker approves your request.
                  </p>
                </div>

                {isLoggedIn && ndaText ? (
                  <NdaSignDialog
                    listingId={listingId}
                    ndaText={ndaText}
                    onSigned={() => {
                      setSignedState(true);
                      window.location.reload();
                    }}
                  />
                ) : (
                  <Button variant="outline" asChild>
                    <a href="/auth/login">Log in to sign NDA</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  document: doc,
  canAccess,
}: {
  document: ListingDocument;
  canAccess: boolean;
}) {
  const pendingApproval = !!(doc.buyer_access_pending || (doc.is_confidential && !canAccess));
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {pendingApproval && doc.is_confidential ? "Awaiting broker approval" : doc.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {!pendingApproval ? (
          <Badge variant="outline" className="text-[10px]">
            {DOCUMENT_CATEGORY_LABELS[doc.category as DocumentCategory] ?? doc.category}
          </Badge>
          ) : doc.is_confidential ? (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <Lock className="h-2.5 w-2.5" />
              Pending approval
            </Badge>
          ) : null}
          {!pendingApproval && doc.file_size ? (
            <span className="text-[10px] text-muted-foreground">
              {formatFileSize(doc.file_size)}
            </span>
          ) : null}
          {doc.is_confidential && !pendingApproval ? (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <Lock className="h-2.5 w-2.5" />
              Confidential
            </Badge>
          ) : null}
        </div>
      </div>
      {canAccess && doc.file_url && (
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon-sm" variant="ghost" asChild>
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Fire-and-forget — never block the click
                void recordDocumentEvent({
                  documentId: doc.id,
                  eventKind: "view",
                }).catch(() => undefined);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button size="icon-sm" variant="ghost" asChild>
            <a
              href={doc.file_url}
              download
              onClick={() => {
                void recordDocumentEvent({
                  documentId: doc.id,
                  eventKind: "download",
                }).catch(() => undefined);
              }}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
