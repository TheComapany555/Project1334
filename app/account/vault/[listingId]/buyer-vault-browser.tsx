"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Eye, FolderLock, Search } from "lucide-react";
import { recordDocumentEvent } from "@/lib/actions/documents";
import type { DocumentFolder } from "@/lib/types/data-room";
import type { ListingDocument } from "@/lib/types/documents";
import { DocumentPreviewModal } from "@/components/listings/document-preview-modal";
import { FileTreeTable } from "@/components/data-room/file-tree-table";
import { SelectionToolbar } from "@/components/data-room/selection-toolbar";

type Props = {
  folders: DocumentFolder[];
  documents: ListingDocument[];
  listingSlug: string;
  downloadAllowed: boolean;
  approvedAt: string | null;
};

export function BuyerVaultBrowser({
  folders,
  documents,
  downloadAllowed,
  approvedAt,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(folders.map((f) => f.id)),
  );
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ListingDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const recentDocIds = useMemo(() => {
    if (!approvedAt) return new Set<string>();
    const cutoff = Math.max(
      new Date(approvedAt).getTime(),
      nowMs - 7 * 24 * 60 * 60 * 1000,
    );
    return new Set(
      documents
        .filter((d) => new Date(d.created_at).getTime() >= cutoff)
        .map((d) => d.id),
    );
  }, [documents, approvedAt, nowMs]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPreview(doc: ListingDocument) {
    setPreviewDoc(doc);
    void recordDocumentEvent({ documentId: doc.id, eventKind: "view" });
  }

  function triggerDownload(doc: ListingDocument) {
    void recordDocumentEvent({ documentId: doc.id, eventKind: "download" });
    window.open(doc.file_url, "_blank", "noopener,noreferrer");
  }

  async function bulkDownload() {
    const docs = documents.filter((d) => selectedIds.has(d.id));
    if (docs.length === 0 || isDownloading) return;
    setIsDownloading(true);
    const toastId = toast.loading(`Downloading 1 of ${docs.length}…`);
    let failed = 0;
    for (const [index, doc] of docs.entries()) {
      toast.loading(`Downloading ${index + 1} of ${docs.length}…`, {
        id: toastId,
      });
      void recordDocumentEvent({ documentId: doc.id, eventKind: "download" });
      try {
        // window.open per file gets popup-blocked after the first, and the
        // download attribute is ignored on cross-origin URLs — so fetch to a
        // blob and download that instead.
        const res = await fetch(doc.file_url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = doc.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        failed += 1;
        window.open(doc.file_url, "_blank", "noopener,noreferrer");
      }
    }
    if (failed > 0) {
      toast.error(
        `Downloaded ${docs.length - failed} of ${docs.length} files. ${failed} opened in a new tab instead.`,
        { id: toastId },
      );
    } else {
      toast.success(
        `Downloaded ${docs.length} file${docs.length === 1 ? "" : "s"}.`,
        { id: toastId },
      );
    }
    setSelectedIds(new Set());
    setIsDownloading(false);
  }

  const headerMeta =
    selectedIds.size > 0 ? (
      <SelectionToolbar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
      >
        <Button
          type="button"
          size="sm"
          onClick={bulkDownload}
          disabled={isDownloading}
        >
          <Download className="size-4" aria-hidden />
          {isDownloading ? "Downloading…" : `Download ${selectedIds.size}`}
        </Button>
      </SelectionToolbar>
    ) : (
      <p className="text-sm text-muted-foreground">
        {folders.length} {folders.length === 1 ? "folder" : "folders"} ·{" "}
        {documents.length} {documents.length === 1 ? "file" : "files"}
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <FileTreeTable
        folders={folders}
        documents={documents}
        expandedIds={expanded}
        onToggleExpand={toggleExpand}
        searchQuery={search}
        selectable={downloadAllowed}
        selectedFileIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onFileOpen={openPreview}
        headerMeta={headerMeta}
        modifiedColumnLabel="Added"
        modifiedField="created_at"
        renderFileBadges={(doc) =>
          recentDocIds.has(doc.id) ? (
            <Badge variant="success" className="shrink-0 text-[10px]">
              New
            </Badge>
          ) : null
        }
        renderFileActions={(doc) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Preview ${doc.name}`}
              onClick={() => openPreview(doc)}
            >
              <Eye className="size-4" aria-hidden />
            </Button>
            {downloadAllowed && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Download ${doc.name}`}
                onClick={() => triggerDownload(doc)}
              >
                <Download className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        )}
        emptyState={
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FolderLock className="size-8" aria-hidden />
            <p className="text-sm">
              {search.trim()
                ? "No documents match your search."
                : "No documents have been shared with you yet."}
            </p>
          </div>
        }
      />

      <DocumentPreviewModal
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(o) => !o && setPreviewDoc(null)}
        showDownload={downloadAllowed}
        onDownload={triggerDownload}
      />
    </div>
  );
}
