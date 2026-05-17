"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder,
  Search,
} from "lucide-react";
import { recordDocumentEvent } from "@/lib/actions/documents";
import type { DocumentFolder } from "@/lib/types/data-room";
import type { ListingDocument } from "@/lib/types/documents";

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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ListingDocument | null>(null);
  const [nowMs] = useState(() => Date.now());

  const tree = useMemo(() => buildTree(folders), [folders]);
  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  const folderPath = useMemo(() => {
    if (!currentFolderId) return "All documents";
    const parts: string[] = [];
    let cursor: string | null = currentFolderId;
    while (cursor) {
      const f = folderById.get(cursor);
      if (!f) break;
      parts.unshift(f.name);
      cursor = f.parent_folder_id;
    }
    return parts.join(" / ") || "Folder";
  }, [currentFolderId, folderById]);

  const subFolders = useMemo(() => {
    return folders.filter((f) => f.parent_folder_id === currentFolderId);
  }, [folders, currentFolderId]);

  const docsInFolder = useMemo(() => {
    return documents.filter((d) => d.folder_id === currentFolderId);
  }, [documents, currentFolderId]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q),
    );
  }, [documents, search]);

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

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Folders
            </p>
          </div>
          <div className="p-1 max-h-[600px] overflow-y-auto">
            <FolderItem
              label="All documents"
              active={currentFolderId === null}
              depth={0}
              onClick={() => {
                setCurrentFolderId(null);
                setSearch("");
              }}
            />
            {tree.map((node) => (
              <FolderNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                currentFolderId={currentFolderId}
                onSelect={(id) => {
                  setCurrentFolderId(id);
                  setSearch("");
                }}
                onToggle={toggleExpand}
                documents={documents}
              />
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium">
              {search.trim()
                ? `Search results (${searchResults?.length ?? 0})`
                : folderPath}
            </p>
            {!search.trim() && (
              <p className="text-xs text-muted-foreground">
                {subFolders.length} folder(s) · {docsInFolder.length} file(s)
              </p>
            )}
          </div>
          <div>
            {search.trim() ? (
              <DocList
                docs={searchResults ?? []}
                folderById={folderById}
                showFolderPath
                recentIds={recentDocIds}
                downloadAllowed={downloadAllowed}
                onPreview={openPreview}
                onDownload={triggerDownload}
              />
            ) : (
              <>
                {subFolders.length > 0 && (
                  <div className="divide-y divide-border">
                    {subFolders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setCurrentFolderId(f.id)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40"
                      >
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <DocList
                  docs={docsInFolder}
                  folderById={folderById}
                  recentIds={recentDocIds}
                  downloadAllowed={downloadAllowed}
                  onPreview={openPreview}
                  onDownload={triggerDownload}
                />
              </>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{previewDoc?.name}</span>
              {previewDoc && downloadAllowed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => triggerDownload(previewDoc)}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/40">
            {previewDoc && <PreviewContent doc={previewDoc} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type TreeNode = DocumentFolder & { children: TreeNode[] };

function buildTree(folders: DocumentFolder[]): TreeNode[] {
  const byParent = new Map<string | null, DocumentFolder[]>();
  for (const f of folders) {
    const arr = byParent.get(f.parent_folder_id) ?? [];
    arr.push(f);
    byParent.set(f.parent_folder_id, arr);
  }
  function build(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? []).map((f) => ({
      ...f,
      children: build(f.id),
    }));
  }
  return build(null);
}

function FolderItem({
  label,
  active,
  depth,
  onClick,
}: {
  label: string;
  active: boolean;
  depth: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-sm hover:bg-muted/50",
        active && "bg-primary/10 text-foreground font-medium",
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

function FolderNode({
  node,
  depth,
  expanded,
  currentFolderId,
  onSelect,
  onToggle,
  documents,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  currentFolderId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  documents: ListingDocument[];
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const folderDocCount = documents.filter((d) => d.folder_id === node.id).length;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded hover:bg-muted/50",
          currentFolderId === node.id && "bg-primary/10",
        )}
      >
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            "h-6 w-5 shrink-0 flex items-center justify-center",
            !hasChildren && "invisible",
          )}
          style={{ marginLeft: depth * 12 }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={() => onSelect(node.id)}
          className="flex-1 flex items-center gap-1.5 py-1.5 text-left text-sm truncate"
        >
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{node.name}</span>
          {folderDocCount > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              {folderDocCount}
            </span>
          )}
        </button>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <FolderNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            currentFolderId={currentFolderId}
            onSelect={onSelect}
            onToggle={onToggle}
            documents={documents}
          />
        ))}
    </div>
  );
}

function DocList({
  docs,
  folderById,
  showFolderPath,
  recentIds,
  downloadAllowed,
  onPreview,
  onDownload,
}: {
  docs: ListingDocument[];
  folderById: Map<string, DocumentFolder>;
  showFolderPath?: boolean;
  recentIds: Set<string>;
  downloadAllowed: boolean;
  onPreview: (d: ListingDocument) => void;
  onDownload: (d: ListingDocument) => void;
}) {
  if (docs.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        No files to show here.
      </div>
    );
  }
  return (
    <div className="divide-y divide-border">
      {docs.map((d) => (
        <div key={d.id} className="px-4 py-3 flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{d.name}</p>
              {recentIds.has(d.id) && (
                <Badge variant="secondary" className="text-[10px]">
                  New
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
              <span>{formatFileSize(d.file_size)}</span>
              {showFolderPath && (
                <span>
                  {d.folder_id
                    ? folderPath(d.folder_id, folderById)
                    : "Root"}
                </span>
              )}
              <span>{formatDate(d.created_at)}</span>
            </div>
            {d.description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {d.description}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPreview(d)}
            className="gap-1"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          {downloadAllowed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDownload(d)}
              className="gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewContent({ doc }: { doc: ListingDocument }) {
  const fileType = (doc.file_type ?? "").toLowerCase();
  const name = doc.name.toLowerCase();
  const isImage = fileType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
  const isPdf = fileType === "application/pdf" || name.endsWith(".pdf");

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.file_url}
        alt={doc.name}
        className="w-full h-full object-contain bg-black/5"
      />
    );
  }
  if (isPdf) {
    return (
      <iframe
        src={`${doc.file_url}#toolbar=1&view=FitH`}
        className="w-full h-full border-0"
        title={doc.name}
      />
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-3 px-6 text-center">
      <FileText className="h-10 w-10" />
      <p>Preview isn&apos;t available for this file type.</p>
      <Button asChild variant="outline" size="sm">
        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
          Open in new tab
        </a>
      </Button>
    </div>
  );
}

function folderPath(
  folderId: string,
  folderById: Map<string, DocumentFolder>,
): string {
  const parts: string[] = [];
  let cursor: string | null = folderId;
  while (cursor) {
    const f = folderById.get(cursor);
    if (!f) break;
    parts.unshift(f.name);
    cursor = f.parent_folder_id;
  }
  return parts.join(" / ");
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
