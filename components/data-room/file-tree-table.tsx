"use client";

import * as React from "react";
import { useMemo } from "react";
import { ChevronRight, Folder } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon } from "@/components/data-room/file-icon";
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils";
import {
  flattenVisibleRows,
  getDescendantFileIds,
  folderPathString,
} from "@/lib/data-room/tree";
import type { DocumentFolder } from "@/lib/types/data-room";
import type { ListingDocument } from "@/lib/types/documents";

const INDENT_PX = 20;
const CHEVRON_SLOT_PX = 24;

type FileTreeTableProps = {
  folders: DocumentFolder[];
  /** Pre-filtered server-side (access level) — never re-filtered here except by search. */
  documents: ListingDocument[];
  expandedIds: Set<string>;
  onToggleExpand: (folderId: string) => void;
  /** Non-empty ⇒ flat search mode: matching files only, with folder-path line. */
  searchQuery?: string;
  /** Omit to hide the checkbox column entirely. Selection holds FILE ids only. */
  selectable?: boolean;
  selectedFileIds?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  onFileOpen: (doc: ListingDocument) => void;
  renderFileBadges?: (doc: ListingDocument) => React.ReactNode;
  renderFileActions?: (doc: ListingDocument) => React.ReactNode;
  renderFolderActions?: (folder: DocumentFolder) => React.ReactNode;
  /** Slot above the table: counts, or a SelectionToolbar when rows are selected. */
  headerMeta?: React.ReactNode;
  loading?: boolean;
  emptyState?: React.ReactNode;
  modifiedColumnLabel?: string;
  modifiedField?: "created_at" | "updated_at";
};

export function FileTreeTable({
  folders,
  documents,
  expandedIds,
  onToggleExpand,
  searchQuery,
  selectable = false,
  selectedFileIds,
  onSelectionChange,
  onFileOpen,
  renderFileBadges,
  renderFileActions,
  renderFolderActions,
  headerMeta,
  loading = false,
  emptyState,
  modifiedColumnLabel = "Modified",
  modifiedField = "created_at",
}: FileTreeTableProps) {
  const searchTerm = searchQuery?.trim().toLowerCase() ?? "";
  const isSearching = searchTerm.length > 0;
  const selected = selectedFileIds ?? new Set<string>();

  const searchDocs = useMemo(() => {
    if (!isSearching) return [];
    return documents
      .filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm) ||
          d.description?.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [documents, searchTerm, isSearching]);

  const treeRows = useMemo(
    () => flattenVisibleRows(folders, documents, expandedIds),
    [folders, documents, expandedIds]
  );

  const descendantFileIds = useMemo(
    () => getDescendantFileIds(folders, documents),
    [folders, documents]
  );

  const hasActionsColumn = Boolean(renderFileActions || renderFolderActions);
  const columnCount =
    2 + (selectable ? 1 : 0) + (hasActionsColumn ? 1 : 0) + 1; // name+size+modified(+checkbox)(+actions)

  const scopeDocs = isSearching ? searchDocs : documents;
  const allSelected =
    scopeDocs.length > 0 && scopeDocs.every((d) => selected.has(d.id));
  const someSelected = scopeDocs.some((d) => selected.has(d.id));
  const selectAllState: boolean | "indeterminate" = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;

  const updateSelection = (mutate: (next: Set<string>) => void) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    mutate(next);
    onSelectionChange(next);
  };

  const toggleSelectAll = () =>
    updateSelection((next) => {
      if (allSelected) scopeDocs.forEach((d) => next.delete(d.id));
      else scopeDocs.forEach((d) => next.add(d.id));
    });

  const toggleFile = (docId: string) =>
    updateSelection((next) => {
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
    });

  const folderCheckState = (
    folderId: string
  ): boolean | "indeterminate" | null => {
    const ids = descendantFileIds.get(folderId) ?? [];
    if (ids.length === 0) return null;
    const selectedCount = ids.filter((id) => selected.has(id)).length;
    if (selectedCount === 0) return false;
    return selectedCount === ids.length ? true : "indeterminate";
  };

  const toggleFolder = (folderId: string) => {
    const ids = descendantFileIds.get(folderId) ?? [];
    const state = folderCheckState(folderId);
    updateSelection((next) => {
      if (state === true) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
    });
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const renderFileRow = (doc: ListingDocument, depth: number) => {
    const isSelected = selected.has(doc.id);
    const path = isSearching ? folderPathString(doc.folder_id, folders) : "";
    const secondary = isSearching ? path : (doc.description ?? "");
    return (
      <TableRow
        key={doc.id}
        data-state={isSelected ? "selected" : undefined}
        className="cursor-pointer"
        onClick={() => onFileOpen(doc)}
      >
        {selectable && (
          <TableCell className="pl-4" onClick={stop}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleFile(doc.id)}
              aria-label={`Select ${doc.name}`}
            />
          </TableCell>
        )}
        <TableCell className="w-full max-w-0">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: depth * INDENT_PX }}
          >
            {!isSearching && (
              <span className="w-6 shrink-0" aria-hidden />
            )}
            <FileIcon name={doc.name} mimeType={doc.file_type} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 cursor-pointer truncate text-left text-sm font-medium outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50"
                  title={doc.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileOpen(doc);
                  }}
                >
                  {doc.name}
                </button>
                {renderFileBadges?.(doc)}
              </div>
              {secondary ? (
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={secondary}
                >
                  {secondary}
                </p>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden w-24 text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
          {formatFileSize(doc.file_size)}
        </TableCell>
        <TableCell className="hidden w-36 text-sm text-muted-foreground md:table-cell">
          {formatRelativeTime(doc[modifiedField])}
        </TableCell>
        {hasActionsColumn && (
          <TableCell className="w-px pr-2 text-right" onClick={stop}>
            {renderFileActions?.(doc)}
          </TableCell>
        )}
      </TableRow>
    );
  };

  const renderFolderRow = (
    folder: DocumentFolder,
    depth: number,
    fileCount: number,
    hasChildren: boolean
  ) => {
    const expanded = expandedIds.has(folder.id);
    const checkState = folderCheckState(folder.id);
    return (
      <React.Fragment key={folder.id}>
        <TableRow
          className="cursor-pointer"
          onClick={() => onToggleExpand(folder.id)}
        >
          {selectable && (
            <TableCell className="pl-4" onClick={stop}>
              {checkState !== null ? (
                <Checkbox
                  checked={checkState}
                  onCheckedChange={() => toggleFolder(folder.id)}
                  aria-label={`Select all files in ${folder.name}`}
                />
              ) : null}
            </TableCell>
          )}
          <TableCell className="w-full max-w-0">
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: depth * INDENT_PX }}
            >
              <button
                type="button"
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-expanded={expanded}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder.id);
                }}
              >
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform duration-200",
                    expanded && "rotate-90"
                  )}
                />
              </button>
              <Folder className="size-4 shrink-0 fill-blue-500/20 text-blue-500 dark:text-blue-400" />
              <span
                className="min-w-0 truncate text-sm font-medium"
                title={folder.name}
              >
                {folder.name}
              </span>
              {fileCount > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {fileCount} {fileCount === 1 ? "file" : "files"}
                </span>
              )}
            </div>
          </TableCell>
          <TableCell className="hidden w-24 text-right text-sm text-muted-foreground sm:table-cell">
            —
          </TableCell>
          <TableCell className="hidden w-36 text-sm text-muted-foreground md:table-cell">
            {formatRelativeTime(folder.updated_at)}
          </TableCell>
          {hasActionsColumn && (
            <TableCell className="w-px pr-2 text-right" onClick={stop}>
              {renderFolderActions?.(folder)}
            </TableCell>
          )}
        </TableRow>
        {expanded && !hasChildren && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount} className="py-2">
              <p
                className="text-xs italic text-muted-foreground"
                style={{
                  paddingLeft:
                    (depth + 1) * INDENT_PX + CHEVRON_SLOT_PX + (selectable ? 8 : 16),
                }}
              >
                No files in this folder
              </p>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  const isEmpty =
    !loading &&
    (isSearching ? searchDocs.length === 0 : treeRows.length === 0);

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground">
      {headerMeta !== undefined && (
        <div className="flex min-h-12 items-center gap-3 border-b bg-muted/30 px-4 py-2">
          {headerMeta}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {selectable && (
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={selectAllState}
                  onCheckedChange={toggleSelectAll}
                  disabled={scopeDocs.length === 0}
                  aria-label="Select all files"
                />
              </TableHead>
            )}
            <TableHead className="w-full">Name</TableHead>
            <TableHead className="hidden w-24 text-right sm:table-cell">
              Size
            </TableHead>
            <TableHead className="hidden w-36 md:table-cell">
              {modifiedColumnLabel}
            </TableHead>
            {hasActionsColumn && (
              <TableHead className="w-px">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {selectable && (
                  <TableCell className="pl-4">
                    <Skeleton className="size-4" />
                  </TableCell>
                )}
                <TableCell className="w-full max-w-0 py-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-4 shrink-0" />
                    <Skeleton className="h-4 w-1/2 max-w-48" />
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="ml-auto h-4 w-12" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                {hasActionsColumn && <TableCell />}
              </TableRow>
            ))
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="py-12 text-center">
                {emptyState ?? (
                  <p className="text-sm text-muted-foreground">
                    {isSearching
                      ? "No documents match your search."
                      : "No documents yet."}
                  </p>
                )}
              </TableCell>
            </TableRow>
          ) : isSearching ? (
            searchDocs.map((doc) => renderFileRow(doc, 0))
          ) : (
            treeRows.map((row) =>
              row.kind === "folder"
                ? renderFolderRow(
                    row.folder,
                    row.depth,
                    row.fileCount,
                    row.hasChildren
                  )
                : renderFileRow(row.doc, row.depth)
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}
